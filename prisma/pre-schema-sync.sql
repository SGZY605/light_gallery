DO $$
DECLARE
  legacy_owner_id TEXT;
  protected_admin_id TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'User'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'status'
  ) AND EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'UserStatus' AND e.enumlabel = 'DISABLED'
  ) THEN
    EXECUTE 'UPDATE "User" SET status = ''ACTIVE'' WHERE status = ''DISABLED''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AuditLog'
  ) AND EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'AuditAction' AND e.enumlabel = 'USER_DISABLED'
  ) THEN
    EXECUTE 'UPDATE "AuditLog" SET action = ''USER_UPDATED'' WHERE action = ''USER_DISABLED''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'role'
  ) AND EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'OWNER'
  ) THEN
    EXECUTE 'UPDATE "User" SET role = ''ADMIN'' WHERE role = ''OWNER''';
  END IF;

  SELECT id
  INTO legacy_owner_id
  FROM "User"
  WHERE lower(email) = 'taka@example.com'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  SELECT id
  INTO protected_admin_id
  FROM "User"
  WHERE lower(email) = 'admin@example.com'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF legacy_owner_id IS NOT NULL AND protected_admin_id IS NOT NULL AND legacy_owner_id <> protected_admin_id THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'Image'
    ) THEN
      UPDATE "Image" SET "uploaderId" = legacy_owner_id WHERE "uploaderId" = protected_admin_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'Tag'
    ) THEN
      UPDATE "Tag" SET "creatorId" = legacy_owner_id WHERE "creatorId" = protected_admin_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'Share'
    ) THEN
      UPDATE "Share" SET "creatorId" = legacy_owner_id WHERE "creatorId" = protected_admin_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'UploadSession'
    ) THEN
      UPDATE "UploadSession" SET "creatorId" = legacy_owner_id WHERE "creatorId" = protected_admin_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ImageLocationOverride'
    ) THEN
      UPDATE "ImageLocationOverride" SET "updatedById" = legacy_owner_id WHERE "updatedById" = protected_admin_id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'AuditLog'
    ) THEN
      UPDATE "AuditLog" SET "actorId" = legacy_owner_id WHERE "actorId" = protected_admin_id;
    END IF;

    DELETE FROM "User" WHERE id = protected_admin_id;
    protected_admin_id := legacy_owner_id;
  END IF;

  IF legacy_owner_id IS NOT NULL AND protected_admin_id IS NULL THEN
    protected_admin_id := legacy_owner_id;
  END IF;

  IF protected_admin_id IS NOT NULL THEN
    UPDATE "User"
    SET email = 'admin@example.com',
        name = '管理员'
    WHERE id = protected_admin_id;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'role'
    ) AND EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'ADMIN'
    ) THEN
      EXECUTE format('UPDATE "User" SET role = ''ADMIN'' WHERE id = %L', protected_admin_id);
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'status'
    ) AND EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'UserStatus' AND e.enumlabel = 'ACTIVE'
    ) THEN
      EXECUTE format('UPDATE "User" SET status = ''ACTIVE'' WHERE id = %L', protected_admin_id);
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ShareImage" (
  "shareId" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShareImage_pkey" PRIMARY KEY ("shareId", "imageId")
);

CREATE INDEX IF NOT EXISTS "ShareImage_imageId_idx" ON "ShareImage"("imageId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ShareImage_shareId_fkey'
  ) THEN
    ALTER TABLE "ShareImage"
    ADD CONSTRAINT "ShareImage_shareId_fkey"
    FOREIGN KEY ("shareId") REFERENCES "Share"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ShareImage_imageId_fkey'
  ) THEN
    ALTER TABLE "ShareImage"
    ADD CONSTRAINT "ShareImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'libraryColumnCount'
  ) THEN
    ALTER TABLE "User"
    ADD COLUMN "libraryColumnCount" INTEGER NOT NULL DEFAULT 4;
  END IF;
END $$;
