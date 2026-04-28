import { UploadDropzone } from "@/components/upload-dropzone";
import { db } from "@/lib/db";

export default async function DashboardUploadPage() {
  const tags = await db.tag.findMany({
    orderBy: {
      name: "asc"
    }
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white/90 px-7 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Upload</p>
        <div className="mt-4 max-w-3xl">
          <h2 className="text-3xl font-semibold text-slate-950">Push originals directly to OSS, then persist metadata once.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The browser reads EXIF locally, requests a signed OSS policy, uploads the original file, and then sends the normalized metadata back to the app.
          </p>
        </div>
      </section>

      <UploadDropzone
        availableTags={tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug
        }))}
      />
    </div>
  );
}
