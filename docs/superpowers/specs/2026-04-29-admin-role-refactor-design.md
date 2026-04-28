# Admin Role Refactor Design

**Date:** 2026-04-29

## Goal

Replace the old owner-based permission model with a two-role system: `ADMIN` and `MEMBER`. Treat `admin@example.com` as the protected default super administrator without introducing a third role.

## Requirements

- Remove `OWNER` role behavior and user-facing references.
- Remove user disable/disabled behavior and user-facing references.
- Seed and preserve a protected admin account at `admin@example.com`.
- Ensure any legacy `taka@example.com` account is replaced by the protected admin account while preserving ownership of existing records.
- Allow admins to create users, change roles, reset any account password, and delete any non-protected account.
- Prevent deletion or demotion of `admin@example.com`.

## Data Model

- `UserRole` keeps only `ADMIN` and `MEMBER`.
- `UserStatus` is removed.
- `AuditAction.USER_DISABLED` is removed.

## Migration Strategy

- Run a pre-schema-sync SQL migration before `prisma db push`.
- Convert any legacy `OWNER` users to `ADMIN`.
- Convert any disabled users back to active behavior by removing status dependence before schema sync.
- If `taka@example.com` exists:
  - Rename it to `admin@example.com` when the protected admin does not yet exist.
  - Otherwise reassign all referenced records to `admin@example.com` and delete `taka@example.com`.

## Application Behavior

- Protected admin uses the normal `ADMIN` role.
- Authorization checks that previously allowed `OWNER` and `ADMIN` now allow only `ADMIN`.
- Session and login flows no longer check user status.
- User management page exposes:
  - create account
  - change role
  - reset password
  - delete account
- Protected admin row cannot be deleted or demoted.

## Verification

- Unit tests cover permissions, seed config, and protected admin rules.
- Existing integration tests switch to `ADMIN`.
- Docker rebuild verifies schema sync, seed, login page access, and protected admin login.
