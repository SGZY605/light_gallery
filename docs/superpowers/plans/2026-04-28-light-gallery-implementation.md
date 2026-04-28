# Light Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working version of the private OSS-backed gallery with login, upload metadata, tag-based dynamic shares, EXIF display, map location overrides, and Docker deployment.

**Architecture:** Use a single Next.js App Router application with server actions/API routes for auth, upload signing, metadata persistence, shares, and map data. PostgreSQL stores users, image metadata, tags, share configuration, EXIF, location overrides, uploads, and audit logs; Alibaba Cloud OSS stores only original image files and serves resized previews through URL parameters.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Vitest, Playwright, Alibaba Cloud OSS, Docker Compose.

---

## File Structure

- `package.json`: scripts and dependencies.
- `next.config.ts`: Next.js config.
- `tsconfig.json`: TypeScript config.
- `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`: styling.
- `docker-compose.yml`, `Dockerfile`, `.env.example`: local and production deployment.
- `prisma/schema.prisma`: database schema.
- `prisma/seed.ts`: initial owner account and demo tags.
- `src/lib/db.ts`: Prisma client singleton.
- `src/lib/auth/password.ts`: password hashing and verification.
- `src/lib/auth/session.ts`: signed cookie session helpers.
- `src/lib/auth/permissions.ts`: role checks.
- `src/lib/oss/config.ts`: OSS environment parsing.
- `src/lib/oss/urls.ts`: thumbnail, preview, original URL generation.
- `src/lib/oss/policy.ts`: direct-upload policy generation.
- `src/lib/images/exif.ts`: EXIF normalization.
- `src/lib/images/location.ts`: effective location resolution.
- `src/lib/shares/tokens.ts`: share token generation and validation helpers.
- `src/lib/shares/query.ts`: tag matching query helpers.
- `src/lib/audit.ts`: audit log writer.
- `src/app/api/auth/login/route.ts`: login API.
- `src/app/api/auth/logout/route.ts`: logout API.
- `src/app/api/uploads/sign/route.ts`: OSS upload signature API.
- `src/app/api/uploads/complete/route.ts`: upload metadata completion API.
- `src/app/api/images/[id]/location/route.ts`: manual location update API.
- `src/app/api/images/[id]/metadata/writeback/route.ts`: reserved writeback API.
- `src/app/api/shares/route.ts`: create and list shares.
- `src/app/api/shares/[id]/revoke/route.ts`: revoke share.
- `src/app/(auth)/login/page.tsx`: login page.
- `src/app/dashboard/layout.tsx`: authenticated shell.
- `src/app/dashboard/page.tsx`: overview.
- `src/app/dashboard/library/page.tsx`: image library.
- `src/app/dashboard/upload/page.tsx`: upload workflow.
- `src/app/dashboard/tags/page.tsx`: tag management.
- `src/app/dashboard/shares/page.tsx`: share management.
- `src/app/dashboard/map/page.tsx`: geotagged photo map.
- `src/app/dashboard/users/page.tsx`: user management.
- `src/app/s/[token]/page.tsx`: public share page.
- `src/components/*`: reusable UI components.
- `tests/unit/*.test.ts`: pure logic tests.
- `tests/integration/*.test.ts`: database-backed integration tests.
- `tests/e2e/gallery.spec.ts`: smoke test.

---

## Task 1: Scaffold The Next.js Project

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`

- [ ] **Step 1: Create project files**

Use this `package.json`:

```json
{
  "name": "light-gallery",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.2",
    "bcryptjs": "^2.4.3",
    "clsx": "^2.1.1",
    "exifr": "^7.1.3",
    "framer-motion": "^11.11.17",
    "jose": "^5.9.6",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.468.0",
    "next": "^15.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-dropzone": "^14.3.5",
    "react-leaflet": "^4.2.1",
    "tailwind-merge": "^2.5.4",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@testing-library/react": "^16.1.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/leaflet": "^1.9.14",
    "@types/node": "^22.10.1",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.0.3",
    "postcss": "^8.4.49",
    "prisma": "^5.22.0",
    "tailwindcss": "^3.4.16",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Use this `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard/library" : "/login");
}
```

- [ ] **Step 2: Run install**

Run: `npm install`

Expected: dependencies install without errors and `package-lock.json` is created.

- [ ] **Step 3: Run type check**

Run: `npm run build`

Expected: build fails only because `@/lib/auth/session` does not exist yet.

- [ ] **Step 4: Commit**

Run:

```bash
git add .
git commit -m "chore: scaffold light gallery app"
```

Expected: commit succeeds if the directory has been initialized as a git repository.

---

## Task 2: Database Schema And Seed

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Create: `.env.example`
- Test: `tests/unit/location.test.ts`

- [ ] **Step 1: Write Prisma schema**

Create models for `User`, `Image`, `ImageExif`, `ImageLocationOverride`, `Tag`, `ImageTag`, `Share`, `ShareTag`, `UploadSession`, `UploadItem`, and `AuditLog`. Use enums `UserRole`, `UserStatus`, `ShareMatchMode`, `UploadStatus`, and `AuditAction`.

Key constraints:

```prisma
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String
  passwordHash String
  role         UserRole   @default(MEMBER)
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Image {
  id          String     @id @default(cuid())
  objectKey   String     @unique
  filename    String
  mimeType    String
  sizeBytes   Int
  width       Int?
  height      Int?
  description String?
  featured    Boolean    @default(false)
  deletedAt   DateTime?
  uploaderId  String
  uploader    User       @relation(fields: [uploaderId], references: [id])
  exif        ImageExif?
  location    ImageLocationOverride?
  tags        ImageTag[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}
```

- [ ] **Step 2: Add seed**

Create an owner user from environment variables:

```ts
const email = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
const password = process.env.SEED_OWNER_PASSWORD ?? "change-me";
```

Hash the password with `bcryptjs` and create default tags `family`, `travel`, `favorite`.

- [ ] **Step 3: Create Prisma client singleton**

Use:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 4: Run migration**

Run: `npm run db:migrate -- --name init`

Expected: Prisma creates an initial migration.

- [ ] **Step 5: Run seed**

Run: `npm run db:seed`

Expected: owner user and default tags are created.

- [ ] **Step 6: Commit**

Run:

```bash
git add prisma src/lib/db.ts .env.example
git commit -m "feat: add gallery database schema"
```

---

## Task 3: Auth, Sessions, And Permissions

**Files:**
- Create: `src/lib/auth/password.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/permissions.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Test: `tests/unit/permissions.test.ts`

- [ ] **Step 1: Write permission tests**

```ts
import { describe, expect, it } from "vitest";
import { canManageUsers, canUpload, canRevokeShare } from "@/lib/auth/permissions";

describe("permissions", () => {
  it("allows owner and admin to manage users", () => {
    expect(canManageUsers("OWNER")).toBe(true);
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageUsers("MEMBER")).toBe(false);
  });

  it("allows all active roles to upload", () => {
    expect(canUpload("OWNER")).toBe(true);
    expect(canUpload("ADMIN")).toBe(true);
    expect(canUpload("MEMBER")).toBe(true);
  });

  it("allows owner and admin to revoke shares", () => {
    expect(canRevokeShare("OWNER")).toBe(true);
    expect(canRevokeShare("ADMIN")).toBe(true);
    expect(canRevokeShare("MEMBER")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/permissions.test.ts`

Expected: fail because permission helpers do not exist.

- [ ] **Step 3: Implement auth helpers**

Implement `hashPassword`, `verifyPassword`, `createSessionCookie`, `readSession`, `requireUser`, `getCurrentUser`, and role helpers. Session cookies must be `httpOnly`, `sameSite: "lax"`, and signed with `SESSION_SECRET`.

- [ ] **Step 4: Implement login/logout API**

`POST /api/auth/login` accepts `{ email, password }`, verifies the user, rejects disabled users, and sets the session cookie. `POST /api/auth/logout` clears the cookie.

- [ ] **Step 5: Implement login page**

Create a minimal polished login form that posts to `/api/auth/login` and redirects to `/dashboard/library` on success.

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test -- tests/unit/permissions.test.ts
npm run build
```

Expected: permission tests pass and build succeeds through auth routes.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/auth src/app/api/auth src/app/'(auth)' tests/unit/permissions.test.ts
git commit -m "feat: add private authentication"
```

---

## Task 4: OSS URL And Upload Signature Services

**Files:**
- Create: `src/lib/oss/config.ts`
- Create: `src/lib/oss/urls.ts`
- Create: `src/lib/oss/policy.ts`
- Create: `src/app/api/uploads/sign/route.ts`
- Test: `tests/unit/oss-urls.test.ts`

- [ ] **Step 1: Write URL tests**

```ts
import { describe, expect, it } from "vitest";
import { buildOssImageUrl } from "@/lib/oss/urls";

describe("buildOssImageUrl", () => {
  it("builds thumbnail URLs with resize params", () => {
    const url = buildOssImageUrl("photos/a.jpg", "thumb", {
      publicBaseUrl: "https://cdn.example.com",
    });
    expect(url).toBe("https://cdn.example.com/photos/a.jpg?x-oss-process=image/resize,w_480/quality,q_82");
  });

  it("encodes object key path segments", () => {
    const url = buildOssImageUrl("photos/hello world.jpg", "preview", {
      publicBaseUrl: "https://cdn.example.com",
    });
    expect(url).toBe("https://cdn.example.com/photos/hello%20world.jpg?x-oss-process=image/resize,w_1600/quality,q_88");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/oss-urls.test.ts`

Expected: fail because OSS URL helper does not exist.

- [ ] **Step 3: Implement URL helper**

Support variants `thumb`, `preview`, and `original`. `original` returns the public URL without processing params.

- [ ] **Step 4: Implement upload policy**

Generate Alibaba Cloud OSS POST policy with expiration, content-length range, MIME prefix, `OSSAccessKeyId`, `policy`, `signature`, `key`, and `success_action_status: "200"`.

- [ ] **Step 5: Implement signature route**

`POST /api/uploads/sign` accepts `{ filename, mimeType, sizeBytes }`, requires login, validates image MIME and configured max size, creates a key like `uploads/yyyy/mm/<cuid>-<safe-name>`, and returns form fields plus upload URL.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test -- tests/unit/oss-urls.test.ts
npm run build
```

Expected: tests pass and route compiles.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/oss src/app/api/uploads tests/unit/oss-urls.test.ts
git commit -m "feat: add oss upload signing"
```

---

## Task 5: Upload Completion, EXIF Normalization, And Audit

**Files:**
- Create: `src/lib/images/exif.ts`
- Create: `src/lib/audit.ts`
- Create: `src/app/api/uploads/complete/route.ts`
- Test: `tests/unit/exif.test.ts`
- Test: `tests/integration/upload-complete.test.ts`

- [ ] **Step 1: Write EXIF normalization tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeExif } from "@/lib/images/exif";

describe("normalizeExif", () => {
  it("keeps common camera fields and numeric GPS values", () => {
    const result = normalizeExif({
      Make: "FUJIFILM",
      Model: "X100V",
      LensModel: "23mmF2",
      FNumber: 2,
      ExposureTime: 0.004,
      ISO: 400,
      latitude: 31.2304,
      longitude: 121.4737,
    });
    expect(result.cameraMake).toBe("FUJIFILM");
    expect(result.cameraModel).toBe("X100V");
    expect(result.fNumber).toBe(2);
    expect(result.latitude).toBe(31.2304);
  });
});
```

- [ ] **Step 2: Implement EXIF normalization**

Map browser-parsed EXIF keys into the `ImageExif` shape. Drop GPS values outside valid ranges. Store original input as `raw`.

- [ ] **Step 3: Implement audit writer**

`writeAuditLog({ actorId, action, entityType, entityId, metadata })` creates an `AuditLog` row.

- [ ] **Step 4: Implement upload completion route**

`POST /api/uploads/complete` accepts object key, file metadata, selected tag IDs or tag names, dimensions, and EXIF. It creates missing tags, creates the image, stores EXIF, links tags, marks upload item complete if present, and writes an audit log.

- [ ] **Step 5: Run integration test**

Run: `npm test -- tests/integration/upload-complete.test.ts`

Expected: upload completion creates image, EXIF, tags, and audit log.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/images src/lib/audit.ts src/app/api/uploads/complete tests/unit/exif.test.ts tests/integration/upload-complete.test.ts
git commit -m "feat: persist uploaded image metadata"
```

---

## Task 6: Dashboard Shell, Library, And Upload UI

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/library/page.tsx`
- Create: `src/app/dashboard/upload/page.tsx`
- Create: `src/components/dashboard-nav.tsx`
- Create: `src/components/image-grid.tsx`
- Create: `src/components/upload-dropzone.tsx`
- Create: `src/components/exif-summary.tsx`

- [ ] **Step 1: Implement protected dashboard layout**

Call `requireUser()` in `src/app/dashboard/layout.tsx`. Render sidebar navigation with Library, Upload, Tags, Shares, Map, Users, Settings.

- [ ] **Step 2: Implement library page**

Query non-deleted images with tags and EXIF. Render a responsive image grid using thumbnail URLs. Provide search input, tag filter area, and selected-count batch toolbar structure.

- [ ] **Step 3: Implement upload page**

Use `react-dropzone` and `exifr` to parse metadata. For each file, request `/api/uploads/sign`, POST to OSS, then call `/api/uploads/complete`. Show queued, uploading, complete, and failed states.

- [ ] **Step 4: Implement EXIF summary component**

Render camera, lens, focal length, aperture, shutter speed, ISO, and taken time when present.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: dashboard and upload pages compile.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/dashboard src/components
git commit -m "feat: add gallery dashboard and upload UI"
```

---

## Task 7: Tags And Dynamic Shares

**Files:**
- Create: `src/lib/shares/tokens.ts`
- Create: `src/lib/shares/query.ts`
- Create: `src/app/api/shares/route.ts`
- Create: `src/app/api/shares/[id]/revoke/route.ts`
- Create: `src/app/dashboard/tags/page.tsx`
- Create: `src/app/dashboard/shares/page.tsx`
- Create: `src/app/s/[token]/page.tsx`
- Test: `tests/unit/share-tokens.test.ts`
- Test: `tests/integration/share-query.test.ts`

- [ ] **Step 1: Write share logic tests**

Test token length, expiration/revocation validation, and `all` tag matching.

- [ ] **Step 2: Implement share helpers**

`createShareToken()` returns a URL-safe random token. `getImagesForShare(shareId)` returns non-deleted images containing every tag attached to the share.

- [ ] **Step 3: Implement share API**

`POST /api/shares` creates shares from title, description, tag IDs, expiration, and allow-download flag. `POST /api/shares/[id]/revoke` sets `revokedAt`.

- [ ] **Step 4: Implement tag page**

Show tags with usage counts. Support rename and merge with server actions or API routes.

- [ ] **Step 5: Implement share management page**

Create share form, list active/expired/revoked shares, copy public URL, revoke share.

- [ ] **Step 6: Implement public share page**

Validate token. Render unavailable page for missing, expired, or revoked shares. Render polished gallery and lightbox for valid shares. Show simplified EXIF and hide GPS.

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm test -- tests/unit/share-tokens.test.ts tests/integration/share-query.test.ts
npm run build
```

Expected: share logic passes and pages compile.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/shares src/app/api/shares src/app/dashboard/tags src/app/dashboard/shares src/app/s tests/unit/share-tokens.test.ts tests/integration/share-query.test.ts
git commit -m "feat: add tag-based sharing"
```

---

## Task 8: Map, Location Overrides, And Reserved Writeback API

**Files:**
- Create: `src/lib/images/location.ts`
- Create: `src/app/api/images/[id]/location/route.ts`
- Create: `src/app/api/images/[id]/metadata/writeback/route.ts`
- Create: `src/app/dashboard/map/page.tsx`
- Create: `src/components/location-editor.tsx`
- Test: `tests/unit/location.test.ts`
- Test: `tests/integration/location-override.test.ts`

- [ ] **Step 1: Write location tests**

```ts
import { describe, expect, it } from "vitest";
import { resolveEffectiveLocation } from "@/lib/images/location";

describe("resolveEffectiveLocation", () => {
  it("prefers manual override over exif gps", () => {
    const result = resolveEffectiveLocation({
      exif: { latitude: 31.2, longitude: 121.4 },
      override: { latitude: 35.6, longitude: 139.7, label: "Tokyo" },
    });
    expect(result).toEqual({ latitude: 35.6, longitude: 139.7, label: "Tokyo", source: "manual" });
  });

  it("uses exif gps when no override exists", () => {
    const result = resolveEffectiveLocation({
      exif: { latitude: 31.2, longitude: 121.4 },
      override: null,
    });
    expect(result?.source).toBe("exif");
  });
});
```

- [ ] **Step 2: Implement location resolver**

Return manual override first, valid EXIF GPS second, and `null` when no valid coordinates exist.

- [ ] **Step 3: Implement location API**

`PUT /api/images/[id]/location` validates coordinates and upserts `ImageLocationOverride`. `DELETE /api/images/[id]/location` clears manual override.

- [ ] **Step 4: Implement reserved writeback API**

`POST /api/images/[id]/metadata/writeback` requires owner/admin and returns `501` JSON:

```json
{
  "error": "metadata_writeback_not_implemented",
  "message": "EXIF writeback is reserved for a future version. Current edits are stored as application metadata."
}
```

- [ ] **Step 5: Implement map page**

Use Leaflet to show clustered or grouped markers from images with effective coordinates. Provide tag and date filters. Open a side panel with thumbnails for clicked locations.

- [ ] **Step 6: Implement location editor**

In image detail contexts, allow entering latitude, longitude, and label. Save through the location API.

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm test -- tests/unit/location.test.ts tests/integration/location-override.test.ts
npm run build
```

Expected: location resolution and override persistence pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/images/location.ts src/app/api/images src/app/dashboard/map src/components/location-editor.tsx tests/unit/location.test.ts tests/integration/location-override.test.ts
git commit -m "feat: add map and location overrides"
```

---

## Task 9: Users, Settings, Docker, And Smoke Tests

**Files:**
- Create: `src/app/dashboard/users/page.tsx`
- Create: `src/app/dashboard/settings/page.tsx`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `tests/e2e/gallery.spec.ts`
- Modify: `.env.example`

- [ ] **Step 1: Implement users page**

Owner/admin can list users, create users, change role, and disable users. Members cannot access the page.

- [ ] **Step 2: Implement settings page**

Show OSS configuration status without exposing secrets. Include share defaults and a disabled “Write EXIF back to original” section that explains it is reserved.

- [ ] **Step 3: Add Docker files**

`docker-compose.yml` must include `app` and `postgres`. `app` depends on `postgres`, exposes port `3000`, and reads environment variables from `.env`.

- [ ] **Step 4: Add E2E smoke test**

Test login, library load, create share from seeded tag, visit share page, and open map page.

- [ ] **Step 5: Run verification**

Run:

```bash
npm test
npm run build
docker compose config
```

Expected: all tests pass, build succeeds, and compose config validates.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/dashboard/users src/app/dashboard/settings Dockerfile docker-compose.yml tests/e2e .env.example
git commit -m "feat: add admin pages and docker deployment"
```

---

## Final Verification

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `docker compose config`.
- [ ] Start with `docker compose up --build`.
- [ ] Log in with the seeded owner account.
- [ ] Upload at least one image through the UI using real OSS credentials.
- [ ] Confirm thumbnail and preview URLs load through OSS processing parameters.
- [ ] Create a tag share and open `/s/[token]` in a private browser session.
- [ ] Edit location metadata for an image and confirm it appears on `/dashboard/map`.
- [ ] Confirm `/api/images/[id]/metadata/writeback` returns `501`.

## Scope Deferred

- Public registration.
- Albums.
- Access-code shares.
- Server-side thumbnail generation.
- Background workers.
- EXIF writeback to the OSS object.
- AI tagging or face recognition.
