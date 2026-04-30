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
  limit as fbLimit,
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
   Notes are a sub-collection on the project doc:
     projects/{projectId}/meetingNotes/{noteId}
   Attachments live in Storage under:
     projects/{projectId}/meeting-notes/{filename}
============================================================= */

const notesCollection = (projectId) =>
  collection(db, "projects", projectId, "meetingNotes");

const noteDoc = (projectId, noteId) =>
  doc(db, "projects", projectId, "meetingNotes", noteId);

const buildAttachmentPath = (projectId, file) => {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `projects/${projectId}/meeting-notes/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safe}`;
};

/* =============================================================
   READ
============================================================= */

/**
 * Cross-project realtime feed of the N most-recently-added meeting notes.
 * Uses a Firestore collectionGroup query — requires a separate rule:
 *   match /{path=**}/meetingNotes/{noteId} { allow read: ... }
 * Each emitted note includes the resolved projectId so callers can link.
 */
export const listenToRecentMeetingNotes = (count, callback) => {
  const q = query(
    collectionGroup(db, "meetingNotes"),
    orderBy("createdAt", "desc"),
    fbLimit(count)
  );
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
      console.error("listenToRecentMeetingNotes:", err);
      callback([]);
    }
  );
};

export const listenToMeetingNotes = (projectId, callback) => {
  if (!projectId) {
    callback([]);
    return () => {};
  }
  const q = query(notesCollection(projectId), orderBy("meetingDate", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error("listenToMeetingNotes:", err);
      callback([]);
    }
  );
};

/* =============================================================
   FILES
============================================================= */

const uploadAttachments = async (projectId, files = []) => {
  if (files.length === 0) return [];

  const uploaded = await Promise.all(
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

  return uploaded;
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

export const createMeetingNote = async (projectId, data, files = [], author) => {
  const attachments = await uploadAttachments(projectId, files);

  const docRef = await addDoc(notesCollection(projectId), {
    title: data.title?.trim() || "Untitled meeting",
    content: data.content || "",
    meetingDate: data.meetingDate || new Date().toISOString().slice(0, 10),
    attendeeIds: Array.from(new Set(data.attendeeIds || [])),
    attachments,
    createdBy: author?.uid || null,
    createdByName: author?.name || author?.email || "Unknown",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id };
};

/* =============================================================
   UPDATE
   Caller passes:
   - data: the new title/content/date/attendeeIds
   - newFiles: File[] to upload
   - removedAttachments: existing attachments the user marked for removal
   - keepAttachments: existing attachments to retain (their {url, storagePath, ...})
============================================================= */

export const updateMeetingNote = async (
  projectId,
  noteId,
  data,
  newFiles = [],
  removedAttachments = [],
  keepAttachments = []
) => {
  // 1. Upload new files
  const newlyUploaded = await uploadAttachments(projectId, newFiles);

  // 2. Update doc with the consolidated attachments list
  await updateDoc(noteDoc(projectId, noteId), {
    title: data.title?.trim() || "Untitled meeting",
    content: data.content || "",
    meetingDate: data.meetingDate || new Date().toISOString().slice(0, 10),
    attendeeIds: Array.from(new Set(data.attendeeIds || [])),
    attachments: [...keepAttachments, ...newlyUploaded],
    updatedAt: serverTimestamp(),
  });

  // 3. Best-effort cleanup of removed files (don't block if some fail)
  await deleteAttachments(removedAttachments);
};

/* =============================================================
   DELETE
============================================================= */

export const deleteMeetingNote = async (projectId, noteId, attachments = []) => {
  await deleteDoc(noteDoc(projectId, noteId));
  await deleteAttachments(attachments);
};
