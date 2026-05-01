import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { SyncButton } from "@/components/sync-button";
import { db } from "@/lib/db";
import { resolveUserOssConfig } from "@/lib/oss/user-config";

export const dynamic = "force-dynamic";

function stringValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function positiveIntegerValue(formData: FormData, key: string, fallback: number): number {
  const value = Number.parseInt(stringValue(formData, key), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function saveOssConfigAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const existing = await db.userOssConfig.findUnique({
    where: {
      userId: user.id
    }
  });
  const accessKeySecret = stringValue(formData, "accessKeySecret") || existing?.accessKeySecret || "";
  const region = stringValue(formData, "region");
  const bucket = stringValue(formData, "bucket");
  const accessKeyId = stringValue(formData, "accessKeyId");
  const publicBaseUrl = stringValue(formData, "publicBaseUrl");
  const uploadBaseUrl = stringValue(formData, "uploadBaseUrl");

  if (!region || !bucket || !accessKeyId || !accessKeySecret || !publicBaseUrl || !uploadBaseUrl) {
    return;
  }

  await db.userOssConfig.upsert({
    where: {
      userId: user.id
    },
    update: {
      accessKeyId,
      accessKeySecret,
      allowedMimePrefix: stringValue(formData, "allowedMimePrefix") || "image/",
      bucket,
      maxUploadBytes: positiveIntegerValue(formData, "maxUploadBytes", 25 * 1024 * 1024),
      policyExpiresSeconds: positiveIntegerValue(formData, "policyExpiresSeconds", 300),
      publicBaseUrl,
      region,
      uploadBaseUrl,
      uploadPrefix: stringValue(formData, "uploadPrefix") || "uploads",
      metadataPrefix: stringValue(formData, "metadataPrefix") || "metadata"
    },
    create: {
      accessKeyId,
      accessKeySecret,
      allowedMimePrefix: stringValue(formData, "allowedMimePrefix") || "image/",
      bucket,
      maxUploadBytes: positiveIntegerValue(formData, "maxUploadBytes", 25 * 1024 * 1024),
      metadataPrefix: stringValue(formData, "metadataPrefix") || "metadata",
      policyExpiresSeconds: positiveIntegerValue(formData, "policyExpiresSeconds", 300),
      publicBaseUrl,
      region,
      uploadBaseUrl,
      uploadPrefix: stringValue(formData, "uploadPrefix") || "uploads",
      userId: user.id
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

type InputFieldProps = {
  defaultValue?: string | number | null;
  description: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
};

function InputField({
  defaultValue,
  description,
  label,
  name,
  placeholder,
  required,
  type = "text"
}: InputFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] text-white/25">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="w-full border-b border-white/[0.06] bg-transparent py-1.5 text-xs text-white/60 outline-none transition placeholder:text-white/15 focus:border-white/20"
      />
      <span className="block text-[10px] leading-4 text-white/18">{description}</span>
    </label>
  );
}

export default async function DashboardSettingsPage() {
  const user = await requireUser();
  const config = await resolveUserOssConfig({ user });
  const savedConfig = await db.userOssConfig.findUnique({
    where: {
      userId: user.id
    }
  });

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-base font-semibold text-white/40">设置</h2>
        <p className="mt-1 text-xs text-white/20">
          配置当前账号自己的 OSS。密钥不会回显；留空表示保持原密钥。
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="border border-white/[0.04] p-3">
          <p className="text-[10px] text-white/20">OSS 状态</p>
          <p className="mt-1 text-sm font-medium text-white/50">{config ? "已配置" : "未配置"}</p>
          <p className="mt-1 text-[10px] text-white/25">当前账号独立使用这一份存储配置。</p>
        </article>
        <article className="border border-white/[0.04] p-3">
          <p className="text-[10px] text-white/20">AccessKey Secret</p>
          <p className="mt-1 text-sm font-medium text-white/50">
            {savedConfig?.accessKeySecret ? "已保存" : "未保存"}
          </p>
          <p className="mt-1 text-[10px] text-white/25">不会明文显示；留空保留原值。</p>
        </article>
        <article className="border border-white/[0.04] p-3">
          <p className="text-[10px] text-white/20">上传大小限制</p>
          <p className="mt-1 text-sm font-medium text-white/50">
            {config ? `${(config.maxUploadBytes / (1024 * 1024)).toFixed(0)} MB` : "未配置"}
          </p>
          <p className="mt-1 text-[10px] text-white/25">用于上传签名和服务端上传校验。</p>
        </article>
      </section>

      <section className="border-t border-white/[0.04] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white/35">本地与 OSS 同步</h3>
            <p className="mt-1 text-[10px] leading-4 text-white/20">
              云端不存在但本地有记录时会删除本地记录；云端存在但本地没有记录时会同步导入本地。
              同时会同步图片的配置信息（标签、描述、位置等）到 OSS 元数据备份。
            </p>
            <p className="mt-1 text-[10px] text-white/18">
              同步结果包含图片同步（deletedLocalRecords、importedOssObjects、restoredLocalRecords）和元数据同步（exportedCount、importedCount）。
            </p>
          </div>
          <SyncButton disabled={!config} />
        </div>
      </section>

      <form action={saveOssConfigAction} className="border-t border-white/[0.04] pt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <InputField name="region" label="OSS 区域" required defaultValue={config?.region} placeholder="cn-shanghai" description="例如 cn-shanghai。" />
          <InputField name="bucket" label="Bucket" required defaultValue={config?.bucket} placeholder="light-gallery" description="当前账号使用的 OSS Bucket。" />
          <InputField name="accessKeyId" label="AccessKey ID" required defaultValue={config?.accessKeyId} description="用于签名上传策略。" />
          <InputField name="accessKeySecret" label="AccessKey Secret" type="password" placeholder={savedConfig?.accessKeySecret ? "留空保持原密钥" : "首次配置必须填写"} required={!savedConfig?.accessKeySecret} description="不会回显保存值。" />
          <InputField name="publicBaseUrl" label="公共访问 URL" required defaultValue={config?.publicBaseUrl} placeholder="https://example.com" description="用于生成缩略图、预览和原图 URL。" />
          <InputField name="uploadBaseUrl" label="上传 URL" required defaultValue={config?.uploadBaseUrl} placeholder="https://bucket.oss-cn-shanghai.aliyuncs.com" description="浏览器或服务端上传到此端点。" />
          <InputField name="uploadPrefix" label="上传前缀" defaultValue={config?.uploadPrefix ?? "uploads"} description="对象 key 前缀，例如 uploads。" />
          <InputField name="metadataPrefix" label="元数据前缀" defaultValue={config?.metadataPrefix ?? "metadata"} description="图片配置信息备份前缀，例如 metadata。" />
          <InputField name="maxUploadBytes" label="上传大小上限" type="number" defaultValue={config?.maxUploadBytes ?? 26214400} description="单位字节，默认 26214400。" />
          <InputField name="policyExpiresSeconds" label="上传策略有效期" type="number" defaultValue={config?.policyExpiresSeconds ?? 300} description="单位秒，默认 300。" />
          <InputField name="allowedMimePrefix" label="允许 MIME 前缀" defaultValue={config?.allowedMimePrefix ?? "image/"} description="默认 image/。" />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white/50 transition hover:text-white/80"
          >
            保存 OSS 配置
          </button>
        </div>
      </form>
    </div>
  );
}
