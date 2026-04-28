# Light Gallery Design

## Goal

Build a lightweight self-hosted gallery for personal or small-group use. The app focuses on a polished private photo library, convenient OSS uploads, tag-based organization, dynamic share pages, and a compact admin console. It should avoid the complexity of a large multi-tenant photo platform.

## Decisions

- Use Alibaba Cloud OSS for image storage.
- Upload original images directly from the browser to OSS using server-generated upload signatures.
- Store only metadata, users, tags, shares, and audit records in the application database.
- Use a small multi-account model with roles, not organizations or tenants.
- Do not expose a public homepage. The root path routes to login when unauthenticated and to the library when authenticated.
- Use tag-first organization. Images do not need to belong to albums.
- Share pages are public links generated from tag filters. They can expire or be revoked.
- Use OSS image processing URL parameters for thumbnails and previews. Do not generate thumbnails in the app in the first version.
- Include EXIF display and map features in the first version.
- Allow manual location metadata overrides without rewriting the original OSS object in the first version.
- Reserve an explicit API boundary for future EXIF writeback to the OSS object.

## Stack

- App: Next.js App Router
- UI: Tailwind CSS, shadcn/ui, Radix primitives, Framer Motion
- Database: PostgreSQL
- ORM: Prisma
- Storage: Alibaba Cloud OSS
- Deployment: Docker Compose with `app` and `postgres` services

## User Model

The app supports a small set of manually created users.

Roles:

- `owner`: full access, including user management and system settings.
- `admin`: manage images, tags, shares, and most users.
- `member`: upload, tag, and manage images according to assigned permissions.

The first version does not include public registration, organizations, tenant isolation, billing, or social features.

## Routes

Public and auth:

- `/`: redirect to `/login` if signed out, or `/dashboard/library` if signed in.
- `/login`: private login page.
- `/s/[token]`: public share page.

Dashboard:

- `/dashboard`: overview with image count, tag count, active shares, and recent uploads.
- `/dashboard/library`: main image library with search, tag filters, sorting, selection, and batch actions.
- `/dashboard/upload`: batch upload workflow.
- `/dashboard/tags`: tag rename, merge, color, and usage counts.
- `/dashboard/shares`: create, copy, expire, and revoke share links.
- `/dashboard/map`: map view of geotagged photos.
- `/dashboard/users`: user management for owner/admin.
- `/dashboard/settings`: OSS settings, share defaults, and reserved advanced metadata options.

## Visual Direction

The signed-in console is clean and efficient. It uses dense but readable grids, restrained controls, and fast batch workflows.

The share page is more gallery-like. It uses generous spacing, image-first composition, responsive masonry or justified-grid layout, smooth lightbox transitions, and minimal text. Share pages can show simplified EXIF metadata in the lightbox.

## Upload Flow

1. A signed-in user opens `/dashboard/upload`.
2. The user chooses default tags and optionally default visibility or description.
3. The user drags or selects multiple image files.
4. The browser reads basic image metadata and EXIF where available.
5. The frontend asks the Next.js API for an OSS direct-upload signature for each file.
6. The API validates the session, role, file type, and file size.
7. The browser uploads the original image directly to OSS.
8. The frontend sends upload completion details, parsed EXIF, dimensions, and tags to the API.
9. The API writes `Image`, `ImageExif`, tag relations, upload session status, and audit records.
10. The library page shows the image using OSS image processing parameters for thumbnail URLs.

Failed uploads remain in the upload queue with retry controls. The first version does not run a worker or server-side thumbnail generator.

## Image Display URLs

The app stores the canonical OSS object key. It derives display URLs as needed:

- Thumbnail: OSS image resize and quality parameters.
- Preview: larger OSS processed image.
- Original: raw OSS object URL or signed download URL, depending on permission and share settings.

The app should centralize URL generation so OSS parameter details do not spread through UI components.

## Tag Organization

Tags are the primary organization model.

Features:

- Create tags during upload or editing.
- Apply tags in bulk.
- Remove tags in bulk.
- Rename tags.
- Merge tags.
- Assign optional colors.
- Filter library by tags.

For share links, selected tags use `all` matching in the first version: a photo must contain every selected tag to appear. The data model should allow adding `any` matching later.

## Sharing

Shares are dynamic tag-based public pages.

Each share includes:

- Random token.
- Title.
- Description.
- Tag filter.
- Expiration time.
- Revoked flag.
- Allow-download flag.
- Creator.

When a visitor opens `/s/[token]`, the app validates the token, expiration, and revocation state. If valid, it queries currently matching images. Newly uploaded photos with matching tags appear automatically.

If a share is expired or revoked, the visitor sees a simple unavailable page.

The first version does not include access codes or private invite lists.

## EXIF Metadata

The app extracts and stores EXIF metadata for display and later filtering.

`ImageExif` fields:

- `imageId`
- `cameraMake`
- `cameraModel`
- `lensModel`
- `focalLength`
- `fNumber`
- `exposureTime`
- `iso`
- `takenAt`
- `width`
- `height`
- `orientation`
- `latitude`
- `longitude`
- `raw`

The dashboard detail drawer can show full EXIF data. Share lightboxes show a smaller subset:

- Camera
- Lens
- Focal length
- Aperture
- Shutter speed
- ISO
- Taken time

GPS data is not shown on share pages by default.

## Map And Location Editing

The dashboard includes `/dashboard/map`.

Map features:

- Show clustered points for photos with effective coordinates.
- Filter map by tags, time, and uploader.
- Click a point to inspect photos at that location.
- Open the image detail drawer from the map.

Location editing:

- If EXIF GPS exists, it becomes the initial location.
- If no GPS exists, the user can add a location manually.
- The user can edit or clear a manually assigned location.
- Manual coordinates are stored separately from original EXIF values.
- Effective location is resolved as manual override first, original EXIF second.

`ImageLocationOverride` fields:

- `imageId`
- `latitude`
- `longitude`
- `label`
- `source`
- `updatedById`
- `updatedAt`

First version location edits only change application metadata. They do not rewrite the OSS object.

## Reserved EXIF Writeback Boundary

The first version reserves interfaces for future writeback but does not implement object rewriting.

Reserved API:

- `POST /api/images/[id]/metadata/writeback`

Reserved service boundary:

- `MetadataWritebackService`

Expected future behavior:

1. Verify owner/admin permission.
2. Load image object key and desired metadata changes.
3. Download original OSS object.
4. Write updated EXIF into a new temporary object.
5. Preserve a backup under a backup prefix.
6. Replace or version the canonical object.
7. Update database writeback status and audit log.

This boundary keeps first-version location editing simple while avoiding a future route and service redesign.

## Data Model

Main tables:

- `User`: account, password hash, role, status, timestamps.
- `Image`: OSS object key, original filename, MIME type, size, width, height, description, featured flag, soft-delete state, uploader, timestamps.
- `ImageExif`: parsed EXIF and raw EXIF JSON.
- `ImageLocationOverride`: manual location metadata.
- `Tag`: name, slug, color, creator, timestamps.
- `ImageTag`: image-to-tag relation.
- `Share`: token, title, description, matching mode, expiration, revoked flag, allow-download flag, creator, timestamps.
- `ShareTag`: share-to-tag relation.
- `UploadSession`: batch upload status, creator, timestamps.
- `UploadItem`: per-file upload status, object key, error message.
- `AuditLog`: actor, action, entity type, entity id, metadata, timestamp.

## Permissions

Rules:

- All dashboard routes require login.
- User management requires owner or admin.
- OSS upload signing requires login and upload permission.
- Delete and share revocation require admin or owner unless ownership rules are later added.
- Public share routes never expose dashboard-only data.
- Share pages do not expose GPS by default.
- Original downloads require the share `allowDownload` flag or authenticated dashboard access.

## Error Handling

Upload errors:

- Unsupported file type: reject before requesting OSS signature.
- OSS signature failure: show retry action.
- OSS upload failure: keep item in queue and allow retry.
- Metadata save failure after OSS upload: mark item as needing recovery and retry metadata save.

Share errors:

- Unknown token: unavailable page.
- Expired share: unavailable page.
- Revoked share: unavailable page.

Map errors:

- Missing coordinates: image is absent from map until location is added.
- Invalid manual coordinates: block save and show field error.

## Testing Strategy

Unit tests:

- OSS URL generation.
- Share token validation.
- Tag matching logic.
- Effective location resolution.
- Permission helpers.

Integration tests:

- Upload completion creates image, EXIF, tag relations, upload item status, and audit log.
- Dynamic share query returns images matching all selected tags.
- Revoked and expired shares are inaccessible.
- Manual location override changes effective location.

End-to-end smoke tests:

- Login.
- Upload mock image metadata.
- Create tag share.
- Visit share page.
- Edit image location and see it on the map.

## Out Of Scope For First Version

- Public registration.
- Albums as a primary organization model.
- Multi-tenant organizations.
- Server-side thumbnail generation.
- Background workers and queues.
- Access-code protected shares.
- Face recognition or AI tagging.
- Rewriting OSS image EXIF.
- Mobile native app.
- Billing, comments, likes, or social feed features.
