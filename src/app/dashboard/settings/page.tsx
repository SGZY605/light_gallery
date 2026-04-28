export const dynamic = "force-dynamic";

type SettingRowProps = {
  label: string;
  value: string;
  description: string;
};

function SettingRow({ label, value, description }: SettingRowProps) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
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
  const uploadBaseUrl = process.env.OSS_UPLOAD_BASE_URL || "根据 Bucket 和 Region 自动推导";
  const maxUploadBytes = process.env.OSS_MAX_UPLOAD_BYTES || "26214400";

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">设置</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">在不暴露密钥的前提下查看环境变量配置。</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          第一版页面刻意保持只读。它会展示核心 OSS 与分享配置是否齐备，同时隐藏具体密钥内容。
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <SettingRow
          label="OSS 状态"
          value={hasOssBaseConfig ? "已配置" : "缺少必填项"}
          description="检查 Region、Bucket、Access Key ID 和 Access Key Secret 是否存在。不会显示密钥内容。"
        />
        <SettingRow
          label="公共基础 URL"
          value={publicBaseUrl}
          description="用于生成图片展示所需的缩略图、预览图和原图地址。"
        />
        <SettingRow
          label="上传大小上限"
          value={`${(Number(maxUploadBytes) / (1024 * 1024)).toFixed(0)} MB`}
          description="浏览器开始直传 OSS 之前，上传签名接口允许的最大文件大小。"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">分享默认项</p>
          <div className="mt-5 space-y-4">
            <SettingRow
              label="匹配模式"
              value="全部匹配"
              description="第一版要求一张图片必须同时命中所有已选标签，才会在分享页中显示。"
            />
            <SettingRow
              label="原图下载"
              value="默认关闭"
              description="公开分享默认不允许下载原图，只有在创建分享时显式开启后才可用。"
            />
            <SettingRow
              label="上传端点"
              value={uploadBaseUrl}
              description="浏览器会使用服务器签名后的表单策略，直接向这个 OSS 端点上传文件。"
            />
          </div>
        </article>

        <article className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">预留的元数据回写</p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">本版本暂不支持 EXIF 回写。</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            位置编辑和后续的元数据调整目前只会保存为应用元数据。在真正实现对象重写流程前，预留的回写接口都会返回 `501`。
          </p>
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">将 EXIF 回写到原图</p>
                <p className="mt-1 text-sm text-slate-600">保留给后续版本。</p>
              </div>
              <button
                type="button"
                disabled
                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
              >
                已禁用
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
