export const dynamic = "force-dynamic";

type SettingRowProps = {
  label: string;
  value: string;
  description: string;
};

function SettingRow({ label, value, description }: SettingRowProps) {
  return (
    <article className="border border-white/[0.04] p-3">
      <p className="text-[10px] text-white/20">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/50">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-white/25">{description}</p>
    </article>
  );
}

export default function DashboardSettingsPage() {
  const hasOssBaseConfig = Boolean(
    process.env.OSS_REGION &&
      process.env.OSS_BUCKET &&
      process.env.OSS_ACCESS_KEY_ID &&
      process.env.OSS_ACCESS_KEY_SECRET
  );
  const publicBaseUrl = process.env.OSS_PUBLIC_BASE_URL || "未配置";
  const uploadBaseUrl = process.env.OSS_UPLOAD_BASE_URL || "从存储桶和区域派生";
  const maxUploadBytes = process.env.OSS_MAX_UPLOAD_BYTES || "26214400";

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">设置</h2>
        <p className="mt-1 text-xs text-white/20">
          基于环境变量的配置。密钥不会暴露。
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <SettingRow
          label="OSS 状态"
          value={hasOssBaseConfig ? "已配置" : "缺少必需的值"}
          description="检查区域、存储桶、访问密钥 ID 和访问密钥密钥。"
        />
        <SettingRow
          label="公共基础 URL"
          value={publicBaseUrl}
          description="用于生成缩略图、预览和原始 URL。"
        />
        <SettingRow
          label="上传大小限制"
          value={`${(Number(maxUploadBytes) / (1024 * 1024)).toFixed(0)} MB`}
          description="上传签名路由接受的最大文件大小。"
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <article className="border border-white/[0.04] p-4">
          <p className="text-[10px] text-amber-500/40">分享默认设置</p>
          <div className="mt-4 space-y-3">
            <SettingRow
              label="匹配模式"
              value="ALL"
              description="所有选定标签都必须匹配，图片才会显示。"
            />
            <SettingRow
              label="允许下载"
              value="默认禁用"
              description="公开分享默认不提供原图下载权限。"
            />
            <SettingRow
              label="上传端点"
              value={uploadBaseUrl}
              description="浏览器直接上传至此 OSS 端点。"
            />
          </div>
        </article>

        <article className="border border-white/[0.04] p-4">
          <p className="text-[10px] text-white/20">保留的元数据回写</p>
          <h3 className="mt-2 text-base font-medium text-white/50">EXIF 回写保持禁用。</h3>
          <p className="mt-1 text-[10px] leading-4 text-white/25">
            位置编辑和未来的元数据调整仅存储为应用程序元数据。
          </p>
          <div className="mt-4 border border-dashed border-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white/40">将 EXIF 写回原始文件</p>
                <p className="text-[10px] text-white/20">预留给未来版本。</p>
              </div>
              <button
                type="button"
                disabled
                className="px-2 py-1 text-[10px] text-white/15"
              >
                禁用
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
