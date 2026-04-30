import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDoc,
} from "firebase/firestore";

/* =========================
   HELPERS
========================= */
const normalizeMemberIds = (memberIds = []) => {
  if (!Array.isArray(memberIds)) return [];
  return [...new Set(memberIds)];
};

/**
 * Read-modify-write upsert of a project entry on a single user doc.
 * - Replaces any existing entry for the same projectId (so renames sync).
 * - Repairs malformed legacy data (e.g. assignedProjects: "" string).
 * - Idempotent: calling twice is a no-op.
 */
const upsertProjectOnUser = async (userId, projectId, projectName) => {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const raw = snap.data().assignedProjects;
  const cleaned = Array.isArray(raw) ? raw.filter((p) => p?.id !== projectId) : [];

  await updateDoc(userRef, {
    assignedProjects: [...cleaned, { id: projectId, name: projectName }],
  });
};

/**
 * Read-modify-write removal of a project entry on a single user doc.
 */
const removeProjectFromUser = async (userId, projectId) => {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const raw = snap.data().assignedProjects;
  if (!Array.isArray(raw)) return;

  const filtered = raw.filter((p) => p?.id !== projectId);
  if (filtered.length === raw.length) return;

  await updateDoc(userRef, { assignedProjects: filtered });
};

/**
 * Run a batch of best-effort user-side syncs and return a list of failures
 * with the exact error reason. The project doc is the source of truth, so
 * we don't want a single user-write failure to throw the whole flow — but
 * we DO want the form to know it happened.
 */
const settleAndCollectFailures = async (userIds, work) => {
  const results = await Promise.allSettled(userIds.map((id) => work(id)));
  return results
    .map((r, i) =>
      r.status === "rejected"
        ? {
            userId: userIds[i],
            reason: r.reason?.message || r.reason?.code || "Unknown error",
          }
        : null
    )
    .filter(Boolean);
};

/* =========================
   REALTIME LISTENER
========================= */
export const listenToProjects = (user, role, callback) => {
  const ref = collection(db, "projects");

  const q =
    role === "admin"
      ? ref
      : query(ref, where("memberIds", "array-contains", user.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    callback(projects);
  });

  return unsubscribe;
};

/* =========================
   CREATE PROJECT
   Returns { docRef, syncFailures } so the caller can warn the user if
   any per-user assignedProjects writes failed.
========================= */
export const createProject = async (project, adminUid) => {
  const memberIds = normalizeMemberIds(project.memberIds);

  const docRef = await addDoc(collection(db, "projects"), {
    ...project,
    memberIds,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
  });

  const projectId = docRef.id;
  const projectName = project.name;

  let syncFailures = [];
  if (memberIds.length > 0) {
    syncFailures = await settleAndCollectFailures(memberIds, (uid) =>
      upsertProjectOnUser(uid, projectId, projectName)
    );
    if (syncFailures.length > 0) {
      console.warn(
        `createProject: ${syncFailures.length}/${memberIds.length} user-side syncs failed`,
        syncFailures
      );
    }
  }

  return { docRef, syncFailures };
};

/* =========================
   UPDATE PROJECT
   - Adds project entry on newly-assigned users
   - Removes from de-assigned users
   - Re-upserts on remaining users when the name changed (so labels stay in sync)
   Returns { syncFailures } for the same UI-warning reason as create.
========================= */
export const updateProject = async (projectId, data) => {
  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) return { syncFailures: [] };

  const oldData = snapshot.data();
  const oldMembers = Array.isArray(oldData.memberIds) ? oldData.memberIds : [];
  const newMembers = normalizeMemberIds(data.memberIds);

  const oldName = oldData.name;
  const newName = data.name;
  const renamed = oldName !== newName;

  const added = newMembers.filter((id) => !oldMembers.includes(id));
  const removed = oldMembers.filter((id) => !newMembers.includes(id));
  // Keep-and-rename: members on both sides need their stored name refreshed
  const kept = newMembers.filter((id) => oldMembers.includes(id));

  // 1️⃣ Project doc — always succeeds first so it's the source of truth
  await updateDoc(projectRef, {
    ...data,
    memberIds: newMembers,
    updatedAt: serverTimestamp(),
  });

  // 2️⃣ Per-user syncs in parallel — tracked individually so we can report
  const failures = [];
  const collectFrom = async (ids, work) => {
    if (ids.length === 0) return;
    const f = await settleAndCollectFailures(ids, work);
    failures.push(...f);
  };

  await Promise.all([
    collectFrom(added, (uid) => upsertProjectOnUser(uid, projectId, newName)),
    collectFrom(removed, (uid) => removeProjectFromUser(uid, projectId)),
    renamed
      ? collectFrom(kept, (uid) => upsertProjectOnUser(uid, projectId, newName))
      : Promise.resolve(),
  ]);

  if (failures.length > 0) {
    console.warn(`updateProject: ${failures.length} user-side syncs failed`, failures);
  }

  return { syncFailures: failures };
};

/* =========================
   PATCH PROJECT (partial updates — used by inline pills like
   status/phase change on the detail page).
   Doesn't touch members, so no user-side sync needed.
========================= */
export const patchProject = async (projectId, patch) => {
  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

/* =========================
   DELETE PROJECT
   Project doc gets deleted FIRST (source of truth). User-side cleanup
   is best-effort: orphan entries in someone's assignedProjects are
   harmless visual cruft, but a failed cleanup must NEVER block the
   actual project deletion.
========================= */
export const deleteProject = async (projectId) => {
  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) return { syncFailures: [] };

  const { memberIds = [], managerIds = [] } = snapshot.data();
  const affectedUserIds = Array.from(new Set([...memberIds, ...managerIds]));

  // 1️⃣ Delete the project doc — only this is allowed to throw
  await deleteDoc(projectRef);

  // 2️⃣ Best-effort cleanup of orphan refs on user docs
  let syncFailures = [];
  if (affectedUserIds.length > 0) {
    syncFailures = await settleAndCollectFailures(affectedUserIds, (uid) =>
      removeProjectFromUser(uid, projectId)
    );
    if (syncFailures.length > 0) {
      console.warn(
        `deleteProject: ${syncFailures.length} user-side cleanups failed`,
        syncFailures
      );
    }
  }

  return { syncFailures };
};

