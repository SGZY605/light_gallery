import { buildOssImageUrl } from "@/lib/oss/urls";
import { ExifSummary } from "@/components/exif-summary";

type ImageGridProps = {
  images: Array<{
    id: string;
    objectKey: string;
    filename: string;
    description?: string | null;
    width?: number | null;
    height?: number | null;
    createdAt?: Date | string;
    tags: Array<{
      id: string;
      name: string;
      slug: string;
      color?: string | null;
    }>;
    exif?: {
      cameraMake?: string | null;
      cameraModel?: string | null;
      lensModel?: string | null;
      focalLength?: number | null;
      fNumber?: number | null;
      exposureTime?: string | null;
      iso?: number | null;
      takenAt?: Date | string | null;
    } | null;
  }>;
  emptyMessage?: string;
};

function formatCreatedAt(value: Date | string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(date);
}

export function ImageGrid({
  images,
  emptyMessage = "No images match the current filters."
}: ImageGridProps) {
  if (!images.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => {
        const thumbUrl = buildOssImageUrl(image.objectKey, "thumb");
        const createdAt = formatCreatedAt(image.createdAt);

        return (
          <article
            key={image.id}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
          >
            <div
              className="aspect-[4/3] bg-slate-200 bg-cover bg-center"
              style={{ backgroundImage: `url("${thumbUrl}")` }}
            />

            <div className="space-y-4 p-5">
              <div className="space-y-1">
                <h2 className="truncate text-base font-semibold text-slate-950">{image.filename}</h2>
                {image.description ? (
                  <p className="line-clamp-2 text-sm text-slate-600">{image.description}</p>
                ) : null}
                {createdAt ? <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{createdAt}</p> : null}
              </div>

              {image.tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {image.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              ) : null}

              <ExifSummary exif={image.exif} className="space-y-1 text-xs text-slate-500" />
            </div>
          </article>
        );
      })}
    </div>
  );
}
