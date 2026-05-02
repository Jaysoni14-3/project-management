import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { db, storage } from "./firebase";

/* =============================================================
   PATHS
   Bugs are a sub-collection on the project doc:
     projects/{projectId}/bugs/{bugId}
   Attachments live in Storage under:
     projects/{projectId}/bugs/{filename}
============================================================= */

const bugsCollection = (projectId) =>
  collection(db, "projects", projectId, "bugs");

const bugDoc = (projectId, bugId) =>
  doc(db, "projects", projectId, "bugs", bugId);

const buildAttachmentPath = (projectId, file) => {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `projects/${projectId}/bugs/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safe}`;
};

/* =============================================================
   READ
============================================================= */

export const listenToBugs = (projectId, callback) => {
  if (!projectId) {
    callback([]);
    return () => {};
  }
  const q = query(bugsCollection(projectId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error("listenToBugs:", err);
      callback([]);
    }
  );
};

/* =============================================================
   FILES
============================================================= */

const uploadAttachments = async (projectId, files = []) => {
  if (files.length === 0) return [];

  return Promise.all(
    files.map(async (file) => {
      const path = buildAttachmentPath(projectId, file);
      const ref = storageRef(storage, path);
      const snap = await uploadBytes(ref, file);
      const url = await getDownloadURL(snap.ref);
      return {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        url,
        storagePath: path,
        uploadedAt: new Date().toISOString(),
      };
    })
  );
};

const deleteAttachments = async (attachments = []) => {
  if (attachments.length === 0) return;
  await Promise.allSettled(
    attachments
      .filter((a) => a?.storagePath)
      .map((a) => deleteObject(storageRef(storage, a.storagePath)))
  );
};

/* =============================================================
   CREATE
============================================================= */

export const createBug = async (projectId, data, files = [], reporter) => {
  const attachments = await uploadAttachments(projectId, files);

  const docRef = await addDoc(bugsCollection(projectId), {
    title: data.title?.trim() || "Untitled bug",
    description: data.description || "",
    stepsToReproduce: data.stepsToReproduce || "",
    severity: data.severity || "medium",
    priority: data.priority || "medium",
    status: data.status || "backlog",
    assigneeId: data.assigneeId || null,
    dueDate: data.dueDate || null,
    attachments,
    reporterId: reporter?.uid || null,
    reporterName: reporter?.name || reporter?.email || "Unknown",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id };
};

/* =============================================================
   UPDATE
   Caller passes:
   - data: the new field values
   - newFiles: File[] to upload
   - removedAttachments: existing attachments the user marked for removal
   - keepAttachments: existing attachments to retain (their {url, storagePath, ...})
============================================================= */

export const updateBug = async (
  projectId,
  bugId,
  data,
  newFiles = [],
  removedAttachments = [],
  keepAttachments = []
) => {
  const newlyUploaded = await uploadAttachments(projectId, newFiles);

  await updateDoc(bugDoc(projectId, bugId), {
    title: data.title?.trim() || "Untitled bug",
    description: data.description || "",
    stepsToReproduce: data.stepsToReproduce || "",
    severity: data.severity || "medium",
    priority: data.priority || "medium",
    status: data.status || "backlog",
    assigneeId: data.assigneeId || null,
    dueDate: data.dueDate || null,
    attachments: [...keepAttachments, ...newlyUploaded],
    updatedAt: serverTimestamp(),
  });

  await deleteAttachments(removedAttachments);
};

/* =============================================================
   PATCH (partial updates — used by the Kanban board for column
   drag-and-drop, inline status / priority / assignee changes).
============================================================= */

export const patchBug = async (projectId, bugId, patch) => {
  await updateDoc(bugDoc(projectId, bugId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

/* =============================================================
   DELETE
============================================================= */

export const deleteBug = async (projectId, bugId, attachments = []) => {
  await deleteDoc(bugDoc(projectId, bugId));
  await deleteAttachments(attachments);
};
