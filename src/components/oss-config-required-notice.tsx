import Link from "next/link";

export function OssConfigRequiredNotice() {
  return (
    <section
      className="mb-4 rounded-lg border px-4 py-3 text-sm"
      style={{
        borderColor: "var(--warning-border)",
        backgroundColor: "var(--warning-bg-subtle)",
        color: "var(--warning-text-muted)"
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium" style={{ color: "var(--warning-text)" }}>
            需要配置个人 OSS
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--warning-text-muted)" }}>
            当前账号还没有可用的 OSS 配置。上传、图库预览和分享图片前，请先在设置页填写自己的存储配置。
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="shrink-0 text-xs font-semibold underline underline-offset-4"
          style={{ color: "var(--warning-link)" }}
        >
          前往设置
        </Link>
      </div>
    </section>
  );
}
