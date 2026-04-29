import { MapExplorer } from "@/components/map-explorer";
import { db } from "@/lib/db";
import { resolveEffectiveLocation } from "@/lib/images/location";

export const dynamic = "force-dynamic";

export default async function DashboardMapPage() {
  const [tags, images] = await Promise.all([
    db.tag.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    db.image.findMany({
      where: {
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
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
    })
  ]);

  const mapImages = images
    .map((image) => {
      const effectiveLocation = resolveEffectiveLocation({
        exif: image.exif,
        override: image.location
      });

      if (!effectiveLocation) {
        return null;
      }

      return {
        id: image.id,
        objectKey: image.objectKey,
        filename: image.filename,
        createdAt: image.createdAt.toISOString(),
        takenAt: image.exif?.takenAt?.toISOString() ?? null,
        effectiveLocation,
        exifLocation: image.exif
          ? {
              latitude: image.exif.latitude,
              longitude: image.exif.longitude
            }
          : null,
        overrideLocation: image.location
          ? {
              latitude: image.location.latitude,
              longitude: image.location.longitude,
              label: image.location.label
            }
          : null,
        tags: image.tags.map(({ tag }) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        }))
      };
    })
    .filter((image): image is NonNullable<typeof image> => image !== null);

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">地图</h2>
        <p className="mt-1 text-xs text-white/20">
          Geotagged photos with optional location overrides.
        </p>
      </section>

      <MapExplorer
        availableTags={tags.map((tag) => ({
          id: tag.id,
          name: tag.name
        }))}
        images={mapImages}
      />
    </div>
  );
}
