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
  const publicBaseUrl = process.env.OSS_PUBLIC_BASE_URL || "Not configured";
  const uploadBaseUrl = process.env.OSS_UPLOAD_BASE_URL || "Derived from bucket + region";
  const maxUploadBytes = process.env.OSS_MAX_UPLOAD_BYTES || "26214400";

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Settings</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">Check environment-backed configuration without exposing secrets.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This page is intentionally read-only in the first version. It shows whether the core OSS and sharing settings are present while leaving secret values hidden.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <SettingRow
          label="OSS status"
          value={hasOssBaseConfig ? "Configured" : "Missing required values"}
          description="Checks for region, bucket, access key id, and access key secret. Secrets are not rendered."
        />
        <SettingRow
          label="Public base URL"
          value={publicBaseUrl}
          description="Used to derive thumbnail, preview, and original URLs for image display."
        />
        <SettingRow
          label="Upload max size"
          value={`${(Number(maxUploadBytes) / (1024 * 1024)).toFixed(0)} MB`}
          description="Maximum file size accepted by the upload signature route before the browser attempts OSS upload."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Share defaults</p>
          <div className="mt-5 space-y-4">
            <SettingRow
              label="Match mode"
              value="ALL"
              description="First version shares require every selected tag to match before an image becomes visible."
            />
            <SettingRow
              label="Allow downloads"
              value="Disabled by default"
              description="Public shares start without original-download access unless explicitly enabled when the share is created."
            />
            <SettingRow
              label="Upload endpoint"
              value={uploadBaseUrl}
              description="Direct browser uploads target this OSS endpoint with a server-signed form policy."
            />
          </div>
        </article>

        <article className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Reserved metadata writeback</p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">EXIF writeback stays disabled in this version.</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Location edits and future metadata tweaks are stored as application metadata only. The reserved writeback endpoint returns a `501` response until object rewrite workflows are implemented.
          </p>
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Write EXIF back to original</p>
                <p className="mt-1 text-sm text-slate-600">Reserved for a future version.</p>
              </div>
              <button
                type="button"
                disabled
                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-500"
              >
                Disabled
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
