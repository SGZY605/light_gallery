import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { syncUserMetadataWithOss } from "@/lib/images/metadata-sync";
import { mapSyncProgressToOverallPercent, type SyncProgress } from "@/lib/images/sync-progress";
import { syncUserImagesWithOss } from "@/lib/images/sync";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: SyncProgress) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            ...data,
            percent: mapSyncProgressToOverallPercent(data)
          })}\n\n`)
        );
      }

      try {
        const fileResult = await syncUserImagesWithOss(user, send);

        const metadataResult = await syncUserMetadataWithOss(user, send);

        send({
          deleted: fileResult.deletedLocalRecords,
          exported: metadataResult.exportedCount,
          imported: fileResult.importedOssObjects + metadataResult.importedCount,
          merged: metadataResult.mergedCount,
          message: "同步完成！",
          percent: 100,
          phase: "done",
          restored: fileResult.restoredLocalRecords
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/library");
        revalidatePath("/dashboard/albums");
        revalidatePath("/dashboard/map");
        revalidatePath("/dashboard/settings");
      } catch (error) {
        send({
          message: error instanceof Error ? error.message : "同步过程中发生未知错误",
          percent: 0,
          phase: "error"
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream"
    }
  });
}
