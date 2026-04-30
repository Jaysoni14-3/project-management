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
  arrayUnion,
  getDoc,
  arrayRemove,
} from "firebase/firestore";

/* =========================
   HELPERS
========================= */
const normalizeMemberIds = (memberIds = []) => {
  if (!Array.isArray(memberIds)) return [];
  return [...new Set(memberIds)];
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

  await Promise.all(
    memberIds.map((empId) =>
      updateDoc(doc(db, "users", empId), {
        assignedProjects: arrayUnion({
          id: projectId,
          name: projectName,
        }),
      })
    )
  );

  return docRef;
};

/* =========================
   UPDATE PROJECT
========================= */
export const updateProject = async (projectId, data) => {
  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) return;

  const oldData = snapshot.data();

  const oldMembers = oldData.memberIds || [];
  const newMembers = normalizeMemberIds(data.memberIds);

  const oldName = oldData.name;
  const newName = data.name;

  const added = newMembers.filter((id) => !oldMembers.includes(id));
  const removed = oldMembers.filter((id) => !newMembers.includes(id));

  // 1️⃣ Update project itself
  await updateDoc(projectRef, {
    ...data,
    memberIds: newMembers,
    updatedAt: new Date(),
  });

  // 2️⃣ Add project to newly assigned users
  await Promise.all(
    added.map((empId) =>
      updateDoc(doc(db, "users", empId), {
        assignedProjects: arrayUnion({
          id: projectId,
          name: newName,
        }),
      })
    )
  );

  // 3️⃣ Remove project from unassigned users
  await Promise.all(
    removed.map((empId) =>
      updateDoc(doc(db, "users", empId), {
        assignedProjects: arrayRemove({
          id: projectId,
          name: oldName,
        }),
      })
    )
  );

  // 4️⃣ Handle rename (sync name for remaining members)
  if (oldName !== newName) {
    await Promise.all(
      newMembers.map(async (empId) => {
        await updateDoc(doc(db, "users", empId), {
          assignedProjects: arrayRemove({
            id: projectId,
            name: oldName,
          }),
        });

        await updateDoc(doc(db, "users", empId), {
          assignedProjects: arrayUnion({
            id: projectId,
            name: newName,
          }),
        });
      })
    );
  }
};

/* =========================
   DELETE PROJECT
========================= */
export const deleteProject = async (projectId) => {
  const projectRef = doc(db, "projects", projectId);
  const snapshot = await getDoc(projectRef);
  if (!snapshot.exists()) return;

  const { memberIds = [], name } = snapshot.data();

  await Promise.all(
    memberIds.map((empId) =>
      updateDoc(doc(db, "users", empId), {
        assignedProjects: arrayRemove({
          id: projectId,
          name,
        }),
      })
    )
  );

  await deleteDoc(projectRef);
};
