# Project Management — Backend

Express + PostgreSQL (via Prisma) API for the Project Management app.

## First-time setup

1. **Install dependencies**

   ```bash
   cd server
   npm install
   ```

2. **Create your `.env`**

   ```bash
   cp .env.example .env
   ```

   Then fill in:
   - `DATABASE_URL` — paste from your Neon project dashboard (must include `?sslmode=require`)
   - `JWT_SECRET` — any long random string (at least 32 chars). Generate one with:
     ```bash
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for the first admin user

   You can leave the `R2_*` variables blank for now — file uploads will fail with a clear error, but everything else works.

3. **Create the database tables**

   ```bash
   npm run db:migrate
   ```

   When prompted for a migration name, type something like `init`.

4. **Create your first admin user**

   ```bash
   npm run db:seed
   ```

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   Visit http://localhost:4000/api/health — you should see `{ "ok": true }`.

## Useful commands

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Start the server with auto-reload                           |
| `npm run db:studio`    | Open Prisma Studio — a visual UI to browse your DB          |
| `npm run db:migrate`   | Create a new migration after changing `prisma/schema.prisma` |
| `npm run db:seed`      | Create the admin user from `.env`                           |

## Folder layout

```
server/
├── prisma/
│   ├── schema.prisma     ← single source of truth for the DB
│   └── seed.js           ← creates the first admin
└── src/
    ├── index.js          ← app entry point
    ├── lib/              ← shared utilities (db client, jwt, r2, errors)
    ├── middleware/       ← auth guards, validation, error handler
    ├── schemas/          ← zod input validation per resource
    └── routes/           ← REST endpoints, one file per resource
```

## When something fails

| Error                                              | Likely cause                                        |
| -------------------------------------------------- | --------------------------------------------------- |
| `P1001` — can't reach DB                           | `DATABASE_URL` wrong or Neon project paused         |
| `JsonWebTokenError`                                | `JWT_SECRET` changed since the token was issued     |
| `CORS error` in browser                            | `CORS_ORIGIN` doesn't match your frontend URL       |
| `R2 is not configured`                             | You tried to upload a file before setting R2 up     |
