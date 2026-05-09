/* URL-safe slug helpers for project routes.

   The route `/projects/:slug` accepts either:
   - a slugified project name ("my-project-name"), preferred for new links
   - a raw cuid (legacy URLs or share links built before slug routing)

   Resolution order: id-exact match first, then slug match. CUIDs and slugs
   share the same character set so a slug that happens to equal a real cuid
   would resolve to the id-matched project — fine because there's only one
   project with that id by definition. */

export const slugify = (raw = "") =>
  String(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const projectPath = (project) => {
  if (!project) return "/projects";
  const slug = slugify(project.name || project.projectName || "");
  return slug ? `/projects/${slug}` : `/projects/${project.id}`;
};

export const projectPathFromName = (name, fallbackId) => {
  const slug = slugify(name || "");
  return slug ? `/projects/${slug}` : fallbackId ? `/projects/${fallbackId}` : "/projects";
};

export const resolveProjectFromUrlParam = (param, projects) => {
  if (!param || !projects?.length) return null;
  const byId = projects.find((p) => p.id === param);
  if (byId) return byId;
  return (
    projects.find(
      (p) => slugify(p.name || p.projectName || "") === param
    ) || null
  );
};

/* Employees use a Notion-style "{slug}-{shortid}" URL because two people
   sharing a name (e.g. "John Smith") is realistic. The shortid is the tail
   of the cuid — collisions on 6 chars are theoretically possible but far
   below the noise floor for any real org. */

const SHORT_ID_LEN = 6;
const shortIdOf = (id = "") => String(id).slice(-SHORT_ID_LEN);

export const employeePath = (emp) => {
  if (!emp?.id) return "/employees";
  const slug = slugify(emp.name || emp.displayName || "");
  const tail = shortIdOf(emp.id);
  return slug ? `/employees/${slug}-${tail}` : `/employees/${emp.id}`;
};

export const resolveEmployeeFromUrlParam = (param, employees) => {
  if (!param || !employees?.length) return null;
  const byId = employees.find((e) => e.id === param);
  if (byId) return byId;
  /* Notion-form: extract the suffix after the last hyphen and match it
     against the tail of any employee id. If multiple ids share the same
     tail the first one wins — extraordinarily unlikely with cuid, but
     deterministic if it ever happens. */
  const lastDash = param.lastIndexOf("-");
  if (lastDash >= 0) {
    const tail = param.slice(lastDash + 1);
    if (tail.length >= 4) {
      const bySuffix = employees.find((e) => shortIdOf(e.id) === tail);
      if (bySuffix) return bySuffix;
    }
  }
  return null;
};
