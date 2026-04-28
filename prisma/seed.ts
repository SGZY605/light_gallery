import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL ?? "owner@example.com").trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? "change-me";
  const passwordHash = await bcrypt.hash(password, 12);
  const updatePassword = process.env.SEED_OWNER_PASSWORD !== undefined;

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Owner",
      role: UserRole.OWNER,
      ...(updatePassword ? { passwordHash } : {}),
    },
    create: {
      email,
      name: "Owner",
      passwordHash,
      role: UserRole.OWNER,
    },
  });

  await Promise.all(
    ["family", "travel", "favorite"].map((name) =>
      prisma.tag.upsert({
        where: { slug: name },
        update: { name },
        create: {
          name,
          slug: name,
        },
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
