import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

/* One-shot demo-team seeder. Idempotent — skips emails that already
   exist. Independent of `prisma migrate reset` on purpose: this is
   developer-triggered ad-hoc data, not part of the schema lifecycle.

   Run from the server/ folder:
     node prisma/seed-demo-users.js
*/

const EMAIL_DOMAIN = "infyappdevelopment.com";
const AVATARS = ["boy_1.jpeg", "boy_2.jpeg", "boy_3.jpeg"];
const pickAvatar = (i) => AVATARS[i % AVATARS.length];

/* Random joined-date within the past ~24 months. ISO `YYYY-MM-DD` so
   it matches the existing `joinedDate` String? column shape. */
const randomJoinedDate = () => {
  const now = Date.now();
  const twoYearsMs = 24 * 30 * 24 * 60 * 60 * 1000;
  const t = now - Math.floor(Math.random() * twoYearsMs);
  return new Date(t).toISOString().slice(0, 10);
};

/* `reportsTo` is an email of an existing or about-to-be-created user.
   Resolution happens after a first pass creates the standalone managers
   so the second pass can look up real ids. `password` follows the
   per-user `<firstname>@123` pattern requested. */
const NEW_USERS = [
  // Reporting to Darshan (already in DB)
  {
    name: "Chaitali",
    email: `chaitali@${EMAIL_DOMAIN}`,
    role: "employee",
    designation: "UI/UX Designer",
    reportsTo: `darshan@${EMAIL_DOMAIN}`,
    password: "Chaitali@123",
  },
  
];

const findIdByEmail = async (email) => {
  const u = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return u?.id ?? null;
};

const upsertUser = async (spec, index) => {
  const existing = await prisma.user.findUnique({
    where: { email: spec.email },
    select: { id: true },
  });
  if (existing) return { status: "skipped" };

  let managerId = null;
  if (spec.reportsTo) {
    managerId = await findIdByEmail(spec.reportsTo);
    if (!managerId) {
      /* Per the user's preference: skip rather than create with a
         dangling reports-to. */
      return { status: "skipped-missing-manager", missing: spec.reportsTo };
    }
  }

  const passwordHash = await bcrypt.hash(spec.password, 10);

  await prisma.user.create({
    data: {
      email: spec.email,
      passwordHash,
      name: spec.name,
      role: spec.role,
      designation: spec.designation,
      avatar: pickAvatar(index),
      joinedDate: randomJoinedDate(),
      isManager: Boolean(spec.isManager),
      managerId,
    },
  });
  return { status: "created" };
};

async function main() {
  /* Two passes so users that report to a brand-new manager (Kamlesh)
     resolve their managerId after Kamlesh exists. */
  const standalone = NEW_USERS.filter(
    (u) => !u.reportsTo || !NEW_USERS.some((other) => other.email === u.reportsTo)
  );
  const dependent = NEW_USERS.filter(
    (u) => u.reportsTo && NEW_USERS.some((other) => other.email === u.reportsTo)
  );

  let created = 0;
  let skipped = 0;
  let skippedMissingManager = 0;

  for (const [i, spec] of standalone.entries()) {
    const r = await upsertUser(spec, i);
    if (r.status === "created") {
      created += 1;
      const ref = spec.reportsTo ? ` → ${spec.reportsTo}` : "";
      console.log(`✔ created ${spec.name} (${spec.email})${ref}`);
    } else if (r.status === "skipped-missing-manager") {
      skippedMissingManager += 1;
      console.warn(
        `⚠ skipped ${spec.email} — manager ${r.missing} not found in DB`
      );
    } else {
      skipped += 1;
      console.log(`· skipped ${spec.email} (already exists)`);
    }
  }

  for (const [i, spec] of dependent.entries()) {
    const r = await upsertUser(spec, standalone.length + i);
    if (r.status === "created") {
      created += 1;
      console.log(`✔ created ${spec.name} (${spec.email}) → ${spec.reportsTo}`);
    } else if (r.status === "skipped-missing-manager") {
      skippedMissingManager += 1;
      console.warn(
        `⚠ skipped ${spec.email} — manager ${r.missing} not found in DB`
      );
    } else {
      skipped += 1;
      console.log(`· skipped ${spec.email} (already exists)`);
    }
  }

  console.log(
    `\nDone. created=${created}  skipped=${skipped}  skipped-missing-manager=${skippedMissingManager}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
