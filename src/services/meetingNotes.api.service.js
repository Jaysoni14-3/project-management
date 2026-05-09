import { api, subscribe } from "./apiClient";

const presignAndUpload = async (files = []) => {
  if (files.length === 0) return [];
  const presigned = await api.post("/api/attachments/presign", {
    files: files.map((f) => ({
      filename: f.name,
      mimeType: f.type || "application/octet-stream",
      size: f.size,
    })),
  });

  await Promise.all(
    presigned.map((p, i) =>
      fetch(p.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": p.mimeType },
        body: files[i],
      }).then((r) => {
        if (!r.ok) throw new Error(`Upload failed (${r.status})`);
      })
    )
  );

  return presigned.map((p) => ({
    filename: p.filename,
    storageKey: p.storageKey,
    size: p.size,
    mimeType: p.mimeType,
  }));
};

export const listenToRecentMeetingNotes = (count, callback) => {
  return subscribe(
    () => api.get(`/api/notes/recent?limit=${count}`),
    (notes) =>
      callback(
        (notes || []).map((n) => ({
          ...n,
          projectId: n.projectId || n.project?.id || null,
        }))
      )
  );
};

export const listenToMeetingNotes = (projectId, callback) => {
  if (!projectId) {
    callback([]);
    return () => {};
  }
  return subscribe(() => api.get(`/api/projects/${projectId}/notes`), callback);
};

export const createMeetingNote = async (projectId, data, files = [], author) => {
  const attachments = await presignAndUpload(files);
  const note = await api.post(`/api/projects/${projectId}/notes`, {
    title: data.title,
    content: data.content,
    meetingDate: data.meetingDate,
    attendeeIds: data.attendeeIds || [],
    attachments,
  });
  return { id: note.id };
};

export const updateMeetingNote = async (
  projectId,
  noteId,
  data,
  newFiles = [],
  removedAttachments = [],
  keepAttachments = []
) => {
  const attachments = await presignAndUpload(newFiles);
  const removedAttachmentIds = removedAttachments
    .map((a) => a.id)
    .filter(Boolean);

  await api.patch(`/api/notes/${noteId}`, {
    title: data.title,
    content: data.content,
    meetingDate: data.meetingDate,
    attendeeIds: data.attendeeIds || [],
    attachments,
    removedAttachmentIds,
  });
};

export const deleteMeetingNote = async (projectId, noteId) => {
  await api.delete(`/api/notes/${noteId}`);
};
