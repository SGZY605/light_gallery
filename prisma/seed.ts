import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getSeedAdminConfig } from "./seed-admin";

const prisma = new PrismaClient();

async function main() {
  const { email, password, updatePassword } = getSeedAdminConfig(process.env);
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "管理员",
      role: UserRole.ADMIN,
      ...(updatePassword ? { passwordHash } : {}),
    },
    create: {
      email,
      name: "管理员",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await Promise.all(
    [
      { slug: "family", name: "家庭" },
      { slug: "travel", name: "旅行" },
      { slug: "favorite", name: "精选" }
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: {
          name: tag.name,
          slug: tag.slug,
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
