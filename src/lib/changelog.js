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
    version: "2026.05.10.2",
    date: "May 10, 2026",
    title: "Modules, team chat, and tougher error handling",
    summary:
      "A big drop. We added a new way to track what's being built, brought real-time chat into the workspace, and tightened up how the app behaves when something goes wrong.",
    highlights: [
      {
        title: "Modules — track what gets built, hand it off cleanly",
        body:
          "Create a module on any project, assign someone, and watch its history. When it's marked complete, a bug ticket auto-fires to your project's testers (or managers if no testers are assigned yet) so QA picks it up without anyone forgetting. Find your active modules on the dashboard, the full history on /modules, and a Modules section inside each project. New 'Tester' role on projects, with a QA badge in the team grid.",
      },
      {
        title: "Real-time chat — DMs and project channels",
        body:
          "Click Chat in the sidebar. Start a 1-on-1 with anyone in the workspace, or jump into a project channel — every project gets one automatically, and members are kept in sync as the team changes. Messages deliver in real time over WebSockets. The right-side panel shows contact details for DMs (email, phone, WhatsApp, designation) and the member roster for channels (tap any member to start a DM).",
      },
      {
        title: "Edit, delete, like, and 'Seen'",
        body:
          "Hover any of your messages and a chevron appears at the top-right with Edit and Delete. Every message gets a heart-icon like that anyone can toggle, with a count chip if there's more than zero. In DMs, you'll see a 'Seen' tag on your most recent message once the other person has read it.",
      },
      {
        title: "WhatsApp-style chat search",
        body:
          "The search bar at the top of the chat list searches both conversation names and message content across every chat you're in. Click a hit to jump straight to that message, highlighted. Inside any chat, the magnifying glass in the header opens a search bar with up/down arrows and a 'n of m' counter to step through matches.",
      },
      {
        title: "Better errors everywhere",
        body:
          "When something fails, you now see a specific message with an icon that matches the kind of failure (offline, timed out, server, permission, etc.) — not a vague 'Something went wrong'. Every error response carries a request id so you can quote it when something doesn't add up. Auto-redirect to login when your session expires. A small banner at the bottom of the screen shows up when you go offline and dismisses on reconnect.",
      },
      {
        title: "Friendlier sign-in errors",
        body:
          "The login screen now tells you exactly what's wrong: 'Incorrect email or password' if you mistyped, 'Server is starting up' if the database is waking up, 'Can't reach the server' if you've lost connectivity. The request id is shown in monospace below the error so you can paste it into a bug report.",
      },
    ],
  },
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
