export const PROTECTED_ADMIN_EMAIL = "admin@example.com";
export const DEFAULT_SEED_ADMIN_PASSWORD = "admin";

export function getSeedAdminConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    email: PROTECTED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD ?? DEFAULT_SEED_ADMIN_PASSWORD,
    updatePassword: env.SEED_ADMIN_PASSWORD !== undefined
  };
}
