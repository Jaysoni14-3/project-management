/* What's new — release notes the team curates by hand.

   Add new entries to the TOP of the array. The latest entry's
   `version` is what gets compared against the user's last-seen
   marker, so bump the version string whenever you ship something
   you want surfaced. Format is free-form (any monotonically
   increasing string works), but a date-stamp like "2026.05.10"
   reads cleanly in the UI.

   Each entry:
     version      — unique key, also the string the user "sees"
     date         — display string, "MMM D, YYYY" or similar
     title        — slide headline
     summary?     — optional 1-2 line paragraph under the title
     highlights?  — array of `{ title, body }` bullet items
*/

export const CHANGELOG = [
  {
    version: "2026.05.10",
    date: "May 10, 2026",
    title: "Admin impersonation, charts, and mentions",
    summary:
      "A bunch of changes landed at once — most are aimed at making the workspace feel more alive day-to-day.",
    highlights: [
      {
        title: "Login as another user",
        body:
          "Admins can now click 'Login as' on any teammate's profile to view the app exactly as they do. A yellow banner stays at the top so it's never forgotten, and one click stops it.",
      },
      {
        title: "Bug trend + workload charts",
        body:
          "The admin dashboard now shows a 30-day intake-vs-resolution trend and a per-person workload bar list. Quick read on whether the backlog is growing and who's underwater.",
      },
      {
        title: "@mentions in comments",
        body:
          "Type @ in any comment, pick a teammate, and they'll get a mention notification at the top of their bell — separated from the regular activity feed.",
      },
      {
        title: "Markdown in comments and descriptions",
        body:
          "Bold, italics, code blocks, lists, links — they all render now in posted comments, bug descriptions, and meeting notes.",
      },
    ],
  },
  {
    version: "2026.05.05",
    date: "May 5, 2026",
    title: "Notifications, search, and slug URLs",
    summary:
      "The first wave of cross-cutting features that pull the app together.",
    highlights: [
      {
        title: "In-app notifications",
        body:
          "Bell in the sidebar lights up when you're assigned a project, bug, or pulled into a meeting. Click any notification to jump straight to the relevant modal.",
      },
      {
        title: "Global search",
        body:
          "Top header bar searches across projects, people, bugs, and meeting notes. Results are grouped by type. Cmd/Ctrl-K from anywhere focuses it.",
      },
      {
        title: "Readable URLs",
        body:
          "/projects/<id> became /projects/<project-name>, and /employees/<id> became /employees/<name>-<short-id>. Old bookmarks still work.",
      },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0]?.version ?? null;
