import { UploadDropzone } from "@/components/upload-dropzone";
import { db } from "@/lib/db";

export default async function DashboardUploadPage() {
  const tags = await db.tag.findMany({
    orderBy: {
      name: "asc"
    }
  });

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">上传</h2>
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
