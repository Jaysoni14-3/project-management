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

import { db } from "./firebase";

/* =============================================================
   Generic comments — works against any parent doc by passing the
   parent's path string. The parent owns a `comments` subcollection.

   Examples of parentPath:
     projects/<projectId>/bugs/<bugId>
     projects/<projectId>/meetingNotes/<noteId>
     projects/<projectId>/tasks/<taskId>
============================================================= */

const commentsCollection = (parentPath) => {
  const segments = parentPath.split("/").filter(Boolean);
  return collection(db, ...segments, "comments");
};

const commentDoc = (parentPath, commentId) => {
  const segments = parentPath.split("/").filter(Boolean);
  return doc(db, ...segments, "comments", commentId);
};

/* =============================================================
   READ — realtime listener, ordered ascending so newest sit at
   the bottom of the thread (chat-style).
============================================================= */

export const listenToComments = (parentPath, callback) => {
  if (!parentPath) {
    callback([]);
    return () => {};
  }
  const q = query(commentsCollection(parentPath), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      console.error("listenToComments:", err);
      callback([]);
    }
  );
};

/* =============================================================
   CREATE
============================================================= */

export const createComment = async (parentPath, body, author) => {
  const docRef = await addDoc(commentsCollection(parentPath), {
    body: body?.trim() || "",
    authorId: author?.uid || null,
    authorName: author?.name || author?.email || "Unknown",
    authorAvatar: author?.avatar || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    edited: false,
  });
  return { id: docRef.id };
};

/* =============================================================
   UPDATE / DELETE — only the author can update/delete (enforced
   client-side; for hard guarantees add Firestore rules).
============================================================= */

export const updateComment = async (parentPath, commentId, body) => {
  await updateDoc(commentDoc(parentPath, commentId), {
    body: body?.trim() || "",
    edited: true,
    updatedAt: serverTimestamp(),
  });
};

export const deleteComment = async (parentPath, commentId) => {
  await deleteDoc(commentDoc(parentPath, commentId));
};
