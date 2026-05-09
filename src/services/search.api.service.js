import { api } from "./apiClient";

/* Single global-search call. Server returns
   { users, projects, bugs, notes } with each group already capped and
   access-filtered. Caller is responsible for debouncing + abort. */
export const globalSearch = (query, { signal } = {}) =>
  api.get(`/api/search?q=${encodeURIComponent(query)}`, { signal });
