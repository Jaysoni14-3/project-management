import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "./firebase";

export const listenToAllTasks = (callback) => {
  const q = query(collectionGroup(db, "tasks"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) =>
      callback(
        snap.docs.map((d) => ({
          id: d.id,
          projectId: d.ref.parent.parent?.id ?? null,
          ...d.data(),
        }))
      ),
    (err) => {
      console.error("listenToAllTasks:", err);
      callback([]);
    }
  );
};

/* =============================================================
   PATHS
   Tasks live as a sub-collection on the project doc:
     projects/{projectId}/tasks/{taskId}
============================================================= */

const tasksCollection = (projectId) =>
  collection(db, "projects", projectId, "tasks");

const taskDoc = (projectId, taskId) =>
  doc(db, "projects", projectId, "tasks", taskId);

/* =============================================================
   READ
============================================================= */

export const listenToTasks = (projectId, callback) => {
  if (!projectId) {
    callback([]);
    return () => {};
  }
  const q = query(tasksCollection(projectId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error("listenToTasks:", err);
      callback([]);
    }
  );
};

/* =============================================================
   CREATE
============================================================= */

export const createTask = async (projectId, data, creator) => {
  const docRef = await addDoc(tasksCollection(projectId), {
    title: data.title?.trim() || "Untitled task",
    description: data.description || "",
    status: data.status || "todo",
    priority: data.priority || "medium",
    assigneeId: data.assigneeId || null,
    dueDate: data.dueDate || null,
    createdBy: creator?.uid || null,
    createdByName: creator?.name || creator?.email || "Unknown",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id };
};

/* =============================================================
   UPDATE
============================================================= */

export const updateTask = async (projectId, taskId, data) => {
  await updateDoc(taskDoc(projectId, taskId), {
    title: data.title?.trim() || "Untitled task",
    description: data.description || "",
    status: data.status || "todo",
    priority: data.priority || "medium",
    assigneeId: data.assigneeId || null,
    dueDate: data.dueDate || null,
    updatedAt: serverTimestamp(),
  });
};

/* =============================================================
   PATCH — partial updates (kanban drag/drop, inline status flips)
============================================================= */

export const patchTask = async (projectId, taskId, patch) => {
  await updateDoc(taskDoc(projectId, taskId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

/* =============================================================
   DELETE
============================================================= */

export const deleteTask = async (projectId, taskId) => {
  await deleteDoc(taskDoc(projectId, taskId));
};
