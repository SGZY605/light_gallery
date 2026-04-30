import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOssConfig } from "@/lib/oss/config";
import { ImageDetailView } from "@/components/image-detail-view";

type ImageDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ImageDetailPage({ params }: ImageDetailPageProps) {
  const { id } = await params;

  const [image, allTags] = await Promise.all([
    db.image.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        exif: true,
        location: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    }),
    db.tag.findMany({
      orderBy: {
        name: "asc"
      }
    })
  ]);

  if (!image) {
    notFound();
  }

  const publicBaseUrl = getOssConfig().publicBaseUrl;

  return (
    <ImageDetailView
      image={{
        id: image.id,
        objectKey: image.objectKey,
        filename: image.filename,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        width: image.width,
        height: image.height,
        description: image.description,
        createdAt: image.createdAt.toISOString(),
        exif: image.exif
          ? {
              cameraMake: image.exif.cameraMake,
              cameraModel: image.exif.cameraModel,
              lensModel: image.exif.lensModel,
              focalLength: image.exif.focalLength,
              fNumber: image.exif.fNumber,
              exposureTime: image.exif.exposureTime,
              iso: image.exif.iso,
              takenAt: image.exif.takenAt?.toISOString() ?? null,
              width: image.exif.width,
              height: image.exif.height,
              latitude: image.exif.latitude,
              longitude: image.exif.longitude,
              raw: image.exif.raw
            }
          : null,
        location: image.location
          ? {
              latitude: image.location.latitude,
              longitude: image.location.longitude,
              label: image.location.label
            }
          : null,
        tags: image.tags.map(({ tag }) => ({
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
