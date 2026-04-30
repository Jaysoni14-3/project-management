import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================================================
   READ
========================================================= */

/** One-time fetch of all users (kept for any non-reactive callers). */
export const getAllEmployees = async () => {
  try {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
};

/**
 * Realtime listener over the users collection. Returns an unsubscribe fn.
 * Mirrors the listenToProjects pattern so cards stay live as either side
 * (projects ↔ users) is mutated.
 */
export const listenToEmployees = (callback) => {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error("listenToEmployees:", err);
      callback([]);
    }
  );
};

/* =========================================================
   BI-DIRECTIONAL PROJECT ↔ USER SYNC
========================================================= */

/**
 * Reconcile a single user's project assignments.
 * - Persists `assignedProjects` on the user doc as the new list of {id, name}
 * - Adds the user's id to memberIds on every newly-assigned project
 * - Removes the user's id from memberIds on every de-assigned project
 *
 * Pass the user's old projects (from the loaded user doc) and the new
 * desired list. Both arrays are [{id, name}].
 */
export const syncUserProjects = async (userId, oldProjects = [], newProjects = []) => {
  const oldIds = new Set(oldProjects.map((p) => p.id));
  const newIds = new Set(newProjects.map((p) => p.id));

  const added = newProjects.filter((p) => !oldIds.has(p.id));
  const removed = oldProjects.filter((p) => !newIds.has(p.id));

  await Promise.all([
    // 1️⃣  user doc: source-of-truth list with normalized {id, name}
    updateDoc(doc(db, "users", userId), {
      assignedProjects: newProjects,
    }),
    // 2️⃣  add user to memberIds on newly assigned projects
    ...added.map((p) =>
      updateDoc(doc(db, "projects", p.id), {
        memberIds: arrayUnion(userId),
      })
    ),
    // 3️⃣  remove user from memberIds on de-assigned projects
    ...removed.map((p) =>
      updateDoc(doc(db, "projects", p.id), {
        memberIds: arrayRemove(userId),
      })
    ),
  ]);
};

/**
 * Strip a user from every project they're referenced in (memberIds + managerIds).
 * Call this BEFORE deleting the user doc so we don't leave dangling references.
 */
export const removeUserFromAllProjects = async (userId) => {
  const memberQ = query(
    collection(db, "projects"),
    where("memberIds", "array-contains", userId)
  );
  const managerQ = query(
    collection(db, "projects"),
    where("managerIds", "array-contains", userId)
  );

  const [memberSnap, managerSnap] = await Promise.all([
    getDocs(memberQ),
    getDocs(managerQ),
  ]);

  const projectIds = new Set();
  memberSnap.docs.forEach((d) => projectIds.add(d.id));
  managerSnap.docs.forEach((d) => projectIds.add(d.id));

  await Promise.all(
    Array.from(projectIds).map((projectId) =>
      updateDoc(doc(db, "projects", projectId), {
        memberIds: arrayRemove(userId),
        managerIds: arrayRemove(userId),
      })
    )
  );
};
