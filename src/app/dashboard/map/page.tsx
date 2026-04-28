import { MapExplorer } from "@/components/map-explorer";
import { db } from "@/lib/db";
import { resolveEffectiveLocation } from "@/lib/images/location";
import { getOssConfig } from "@/lib/oss/config";

export const dynamic = "force-dynamic";

export default async function DashboardMapPage() {
  const publicBaseUrl = getOssConfig().publicBaseUrl;
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
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">地图</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">查看带地理位置的照片，并在不改动原图的情况下覆盖位置。</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          查询时会优先使用手动坐标覆盖 EXIF GPS。地图会按生效坐标精确分组，并在选择标记后打开编辑面板。
        </p>
      </section>

      <MapExplorer
        availableTags={tags.map((tag) => ({
          id: tag.id,
          name: tag.name
        }))}
        images={mapImages}
        publicBaseUrl={publicBaseUrl}
      />
    </div>
  );
}
