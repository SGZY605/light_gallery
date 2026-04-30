# User-Isolated OSS Settings Design

## Goal

Implement per-user OSS configuration and strict user data isolation without changing the visible gallery workflows. Administrators only manage accounts. They cannot view or edit other users' business data or OSS settings.

## Data Ownership

Every business object is owned by exactly one user:

- Images are owned by `Image.uploaderId`.
- Tags are owned by `Tag.creatorId`.
- Shares are owned by `Share.creatorId`.
- Upload sessions are owned by `UploadSession.creatorId`.
- Manual location overrides belong to the image owner and record `updatedById`.
- OSS settings are stored in a new one-to-one `UserOssConfig` record keyed by `userId`.

Tags are no longer globally unique. `name` and `slug` are unique inside a user's namespace, so different users can both create a tag named `家庭`.

## OSS Configuration

The settings page edits only the current user's `UserOssConfig`. The form includes region, bucket, access key ID, access key secret, public base URL, upload base URL, upload prefix, max upload bytes, policy expiry, and allowed MIME prefix.

Access key secret is never rendered back to the browser. If a user already has a secret, leaving the secret input blank preserves the old value. If no secret exists, saving requires a secret.

The `.env` OSS configuration is only the default OSS configuration for the protected super administrator account (`admin@example.com`). Ordinary users never fall back to `.env`; they must configure their own OSS settings.

## First Login / Missing Config Reminder

When a non-super-admin user has no usable OSS config, the dashboard shows a prominent reminder linking to `/dashboard/settings`. Upload APIs return an explicit missing-configuration error instead of attempting to use shared `.env` values.

Pages that require image URLs, such as library, albums, map, detail, and public share rendering, use the owner's resolved OSS config. If no usable config exists, the page shows a setup/missing-config notice instead of throwing.

## Access Control

All dashboard pages and mutating APIs filter by current user:

- Library, albums, map, upload, tags, shares, image detail, and image edit routes only read or mutate rows owned by the current user.
- Tag selection in upload, share creation, and image editing only accepts the current user's tag IDs.
- Share revocation only affects shares owned by the current user.
- Public share pages still work without login, but share image queries include `Image.uploaderId = share.creatorId`, preventing tag collisions from exposing other users' photos.

Admin users retain access to `/dashboard/users`, but that page only shows account metadata and account management actions. It does not expose OSS configuration or business data.

## User Deletion

Deleting a user deletes that user's business data and OSS config. It must not reassign images, tags, shares, upload sessions, or location overrides to the super administrator.

The protected super administrator account remains non-deletable.

## Testing

Automated tests cover:

- Super admin `.env` OSS fallback and member no-fallback behavior.
- Settings form contract: secret is not echoed and blank secret preserves existing value.
- User-scoped query contracts for library, albums, map, upload, tags, shares, image detail, and APIs.
- Upload persistence only accepts current user's tags and creates tags inside the current user's namespace.
- Public share queries restrict images to the share creator.
- Deleting a user cascades business data instead of reassigning it.
