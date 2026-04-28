import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEED_ADMIN_PASSWORD,
  PROTECTED_ADMIN_EMAIL,
  getSeedAdminConfig
} from "../../prisma/seed-admin";

describe("seed admin config", () => {
  it("uses the protected admin email and default password when env values are missing", () => {
    expect(getSeedAdminConfig({} as NodeJS.ProcessEnv)).toEqual({
      email: PROTECTED_ADMIN_EMAIL,
      password: DEFAULT_SEED_ADMIN_PASSWORD,
      updatePassword: false
    });
  });

  it("does not allow overriding the protected admin email from env", () => {
    expect(
      getSeedAdminConfig({
        SEED_ADMIN_EMAIL: "someone-else@example.com",
        SEED_ADMIN_PASSWORD: "secret"
      } as NodeJS.ProcessEnv)
    ).toEqual({
      email: PROTECTED_ADMIN_EMAIL,
      password: "secret",
      updatePassword: true
    });
  });
});
