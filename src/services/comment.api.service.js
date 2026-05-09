import { api, subscribe } from "./apiClient";

// firebase parentPath looks like:
//   projects/<projectId>/bugs/<bugId>
//   projects/<projectId>/tasks/<taskId>
//   projects/<projectId>/meetingNotes/<noteId>
const PARENT_TYPE_BY_SEGMENT = {
  bugs: "bug",
  tasks: "task",
  meetingNotes: "meeting_note",
};

const parsePath = (parentPath) => {
  const segments = (parentPath || "").split("/").filter(Boolean);
  const last = segments[segments.length - 2];
  const id = segments[segments.length - 1];
  const parentType = PARENT_TYPE_BY_SEGMENT[last];
  return { parentType, parentId: id };
};

export const listenToComments = (parentPath, callback) => {
  if (!parentPath) {
    callback([]);
    return () => {};
  }
  const { parentType, parentId } = parsePath(parentPath);
  if (!parentType || !parentId) {
    callback([]);
    return () => {};
  }
  return subscribe(
    () =>
      api.get(
        `/api/comments?parentType=${parentType}&parentId=${encodeURIComponent(parentId)}`
      ),
    callback
  );
};

export const createComment = async (parentPath, body, author) => {
  const { parentType, parentId } = parsePath(parentPath);
  const created = await api.post("/api/comments", {
    parentType,
    parentId,
    body,
  });
  return { id: created.id };
};

export const updateComment = async (parentPath, commentId, body) => {
  await api.patch(`/api/comments/${commentId}`, { body });
};

export const deleteComment = async (parentPath, commentId) => {
  await api.delete(`/api/comments/${commentId}`);
};
