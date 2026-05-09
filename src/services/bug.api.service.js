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

export const listenToBugs = (projectId, callback) => {
  if (!projectId) {
    callback([]);
    return () => {};
  }
  return subscribe(() => api.get(`/api/projects/${projectId}/bugs`), callback);
};

export const listenToAllBugs = (callback) =>
  subscribe(() => api.get("/api/bugs"), callback);

export const listenToRecentBugs = (limit, callback) =>
  subscribe(() => api.get(`/api/bugs/recent?limit=${limit}`), callback);

export const createBug = async (projectId, data, files = [], reporter) => {
  const attachments = await presignAndUpload(files);
  const bug = await api.post(`/api/projects/${projectId}/bugs`, {
    ...data,
    attachments,
  });
  return { id: bug.id };
};

export const updateBug = async (
  projectId,
  bugId,
  data,
  newFiles = [],
  removedAttachments = [],
  keepAttachments = []
) => {
  const attachments = await presignAndUpload(newFiles);
  const removedAttachmentIds = removedAttachments
    .map((a) => a.id)
    .filter(Boolean);

  await api.patch(`/api/bugs/${bugId}`, {
    ...data,
    attachments,
    removedAttachmentIds,
  });
};

export const patchBug = async (projectId, bugId, patch) => {
  await api.patch(`/api/bugs/${bugId}`, patch);
};

export const deleteBug = async (projectId, bugId) => {
  await api.delete(`/api/bugs/${bugId}`);
};
