import { notFound } from "next/navigation";
import { ImageDetailView } from "@/components/image-detail-view";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { filterImagesExistingInOss } from "@/lib/images/sync";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

type ImageDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ImageDetailPage({ params }: ImageDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;

  const [image, allTags] = await Promise.all([
    db.image.findFirst({
      where: {
        id,
        deletedAt: null,
        uploaderId: user.id
      },
      include: {
        exif: true,
        location: true,
        tags: {
          include: {
            tag: true
          },
          where: {
            tag: {
              creatorId: user.id
            }
          }
        }
      }
    }),
    db.tag.findMany({
      where: {
        creatorId: user.id
      },
      orderBy: {
        name: "asc"
      }
    })
  ]);

  if (!image) {
    notFound();
  }

  const ossConfig = await resolveUserOssConfig({ user });

  if (!ossConfig) {
    return null;
  }

  const [visibleImage] = await filterImagesExistingInOss({
    config: ossConfig,
    images: [image],
    userId: user.id
  });

  if (!visibleImage) {
    notFound();
  }

  const publicBaseUrl = ossConfig.publicBaseUrl;

  return (
    <ImageDetailView
      image={{
        id: visibleImage.id,
        objectKey: visibleImage.objectKey,
        filename: visibleImage.filename,
        mimeType: visibleImage.mimeType,
        sizeBytes: visibleImage.sizeBytes,
        width: visibleImage.width,
        height: visibleImage.height,
        description: visibleImage.description,
        featured: visibleImage.featured,
        createdAt: visibleImage.createdAt.toISOString(),
        exif: visibleImage.exif
          ? {
              cameraMake: visibleImage.exif.cameraMake,
              cameraModel: visibleImage.exif.cameraModel,
              lensModel: visibleImage.exif.lensModel,
              focalLength: visibleImage.exif.focalLength,
              fNumber: visibleImage.exif.fNumber,
              exposureTime: visibleImage.exif.exposureTime,
              iso: visibleImage.exif.iso,
              takenAt: visibleImage.exif.takenAt?.toISOString() ?? null,
              width: visibleImage.exif.width,
              height: visibleImage.exif.height,
              latitude: visibleImage.exif.latitude,
              longitude: visibleImage.exif.longitude,
              raw: visibleImage.exif.raw
            }
          : null,
        location: visibleImage.location
          ? {
              latitude: visibleImage.location.latitude,
              longitude: visibleImage.location.longitude,
              label: visibleImage.location.label
            }
          : null,
        tags: visibleImage.tags.map(({ tag }) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color
        }))
      }}
      allTags={allTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color
      }))}
      publicBaseUrl={publicBaseUrl}
    />
  );
}
