import { UploadDropzone } from "@/components/upload-dropzone";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export default async function DashboardUploadPage() {
  const user = await requireUser();
  const tags = await db.tag.findMany({
    where: {
      creatorId: user.id
    },
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
