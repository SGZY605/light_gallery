import { Prisma } from "@prisma/client";
import { db } from "./db";

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await db.systemSetting.findUnique({
    where: { key }
  });

  if (!row) {
    return defaultValue;
  }

  return row.value as T;
}

export async function setSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await db.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

export async function isRegistrationAllowed(): Promise<boolean> {
  return getSetting<boolean>("allowRegistration", false);
}
