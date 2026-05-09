import { api, normalizeUser } from "./apiClient";

const normalize = normalizeUser;

export const onAuthChange = (callback) => {
  let stopped = false;

  const fetchMe = async () => {
    try {
      const me = await api.get("/api/auth/me");
      if (!stopped) callback(normalize(me));
    } catch (err) {
      if (!stopped) callback(null);
    }
  };

  fetchMe();

  // No native server-push for session changes; refetch periodically so a
  // logout from another tab eventually syncs. Cheap enough at 30s.
  const id = setInterval(fetchMe, 30000);
  return () => {
    stopped = true;
    clearInterval(id);
  };
};

export const login = async (email, password) => {
  await api.post("/api/auth/login", { email, password });
};

export const logout = async () => {
  await api.post("/api/auth/logout");
};

export const updateMyProfile = async (uid, patch) => {
  await api.patch(`/api/users/${uid}`, patch);
};

export const changeMyPassword = async (currentPassword, newPassword) => {
  await api.post("/api/auth/change-password", { currentPassword, newPassword });
};

/* Impersonation — admin starts a session as another user. The
   server tags the session JWT with the admin's id under `imp` so
   `/me` returns `impersonatedBy` for the banner. */
export const impersonateUser = (userId) =>
  api.post(`/api/auth/impersonate/${userId}`);

export const stopImpersonating = () =>
  api.post("/api/auth/stop-impersonating");

export const createUserAccount = async ({ email, password, profile }) => {
  const created = await api.post("/api/auth/register", {
    email,
    password,
    name: profile.name,
    role: profile.role,
    avatar: profile.avatar,
    whatsapp: profile.whatsapp,
    phoneNumber: profile.phoneNumber,
    joinedDate: profile.joinedDate,
    designation: profile.designation,
    isManager: Boolean(profile.isManager),
    managerId: profile.managerID || profile.managerId || null,
  });
  return { id: created.id };
};
