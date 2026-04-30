import { MapExplorer } from "@/components/map-explorer";
import { OssConfigRequiredNotice } from "@/components/oss-config-required-notice";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { resolveEffectiveLocation } from "@/lib/images/location";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

export const dynamic = "force-dynamic";

export default async function DashboardMapPage() {
  const user = await requireUser();
  const images = await db.image.findMany({
    where: {
      deletedAt: null,
      uploaderId: user.id
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
        },
        where: {
          tag: {
            creatorId: user.id
          }
        }
      }
    }
  });

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
        tags: image.tags.map(({ tag }) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        }))
      };
    })
    .filter((image): image is NonNullable<typeof image> => image !== null);
  const ossConfig = await resolveUserOssConfig({ user });

  if (!ossConfig) {
    return <OssConfigRequiredNotice />;
  }

  const publicBaseUrl = ossConfig.publicBaseUrl;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">地图</h2>
        <p className="mt-1 text-xs text-white/20">
          显示图库中带地理位置的图片。
        </p>
      </section>

      <MapExplorer
        images={mapImages}
        publicBaseUrl={publicBaseUrl}
      />
    </div>
  );
}
