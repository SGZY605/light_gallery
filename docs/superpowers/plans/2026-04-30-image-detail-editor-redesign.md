# 图片详情页重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构图片详情页的查看器、侧栏编辑和保存链路，使其支持可靠的缩放拖动、统一保存标签与地理位置、未保存关闭确认以及专业摄影元数据展示。

**Architecture:** 保留独立详情路由 `/dashboard/library/[id]`，将数据保存逻辑收敛到 `PUT /api/images/[id]` 聚合接口，并把前端重构为三层：纯函数辅助层、图片查看器交互层、右侧草稿编辑层。为便于 TDD，图片变换、草稿脏状态和保存载荷组装提取为可测试的纯函数，组件只负责连接状态与界面。

**Tech Stack:** Next.js App Router, React 18, TypeScript, Prisma, Vitest, Leaflet, Framer Motion, Tailwind CSS

---

## 文件结构

**新增文件**

- `src/lib/images/detail-editor.ts`：统一保存请求、草稿状态、元数据展示和位置回退相关纯函数。
- `src/lib/images/viewer-transform.ts`：图片缩放、平移边界和滚轮缩放中心计算。
- `tests/integration/image-detail-update-route.test.ts`：聚合保存接口测试。
- `tests/unit/detail-editor.test.ts`：草稿和元数据辅助函数测试。
- `tests/unit/viewer-transform.test.ts`：查看器缩放和平移辅助函数测试。

**修改文件**

- `src/app/api/images/[id]/route.ts`：新增 `PUT`，保留 `GET`。
- `src/app/api/images/[id]/location/route.ts`：收缩为兼容接口或复用聚合保存逻辑。
- `src/app/api/images/[id]/tags/route.ts`：收缩为兼容接口或复用聚合保存逻辑。
- `src/components/image-detail-view.tsx`：修复入场动画与缩放拖动冲突，统一关闭守卫。
- `src/components/image-detail-sidebar.tsx`：改为统一草稿态、统一保存、底部操作区和更清晰的信息结构。
- `src/components/mini-map-internal.tsx`：使用 pin 风格 marker，支持坐标输入回显与视图同步。
- `src/components/image-grid.tsx`：确保缩略图入场动画所需 rect 采集稳定。
- `src/app/dashboard/library/[id]/page.tsx`：为新侧栏和查看器补充必要数据。

---

### Task 1: 聚合保存接口与纯函数基础

**Files:**
- Create: `src/lib/images/detail-editor.ts`
- Create: `tests/unit/detail-editor.test.ts`
- Create: `tests/integration/image-detail-update-route.test.ts`
- Modify: `src/app/api/images/[id]/route.ts`
- Modify: `src/app/api/images/[id]/location/route.ts`
- Modify: `src/app/api/images/[id]/tags/route.ts`

- [ ] **Step 1: 写 `detail-editor` 纯函数失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  buildDetailSavePayload,
  getEditableLocationSeed,
  hasDetailDraftChanges,
  summarizeStructuredMetadata
} from "@/lib/images/detail-editor";

describe("detail editor helpers", () => {
  it("prefers manual location for editable seed and falls back to exif gps", () => {
    expect(
      getEditableLocationSeed({
        location: { latitude: 35.6, longitude: 139.7, label: "Tokyo" },
        exif: { latitude: 31.2, longitude: 121.4 }
      })
    ).toEqual({
      latitude: "35.600000",
      longitude: "139.700000",
      label: "Tokyo",
      source: "manual"
    });
  });

  it("detects dirty draft when tags or coordinates change", () => {
    expect(
      hasDetailDraftChanges({
        initialTagIds: ["tag-1"],
        draftTagIds: ["tag-1", "tag-2"],
        initialLocation: { latitude: "31.230400", longitude: "121.473700", label: "" },
        draftLocation: { latitude: "31.230400", longitude: "121.473700", label: "" }
      })
    ).toBe(true);
  });

  it("builds null location payload when manual override is cleared", () => {
    expect(
      buildDetailSavePayload({
        draftTagIds: ["tag-1"],
        draftLocation: { latitude: "", longitude: "", label: "" }
      })
    ).toEqual({
      tagIds: ["tag-1"],
      location: null
    });
  });

  it("summarizes structured metadata for the sidebar", () => {
    expect(
      summarizeStructuredMetadata({
        filename: "demo.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1048576,
        width: 6000,
        height: 4000,
        createdAt: "2026-04-30T08:00:00.000Z",
        exif: {
          cameraMake: "FUJIFILM",
          cameraModel: "X100V",
          lensModel: "23mmF2",
          focalLength: 23,
          fNumber: 2,
          exposureTime: "1/250",
          iso: 400,
          takenAt: "2026-04-01T10:00:00.000Z"
        },
        location: null
      }).camera
    ).toContain("FUJIFILM");
  });
});
```

- [ ] **Step 2: 运行纯函数测试，确认正确失败**

Run: `npm test -- tests/unit/detail-editor.test.ts`

Expected: FAIL，提示 `Cannot find module '@/lib/images/detail-editor'` 或导出不存在。

- [ ] **Step 3: 写聚合保存接口失败测试**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const imageFindUniqueMock = vi.fn();
const transactionMock = vi.fn();
const tagFindManyMock = vi.fn();
const imageTagDeleteManyMock = vi.fn();
const imageTagCreateManyMock = vi.fn();
const imageLocationOverrideUpsertMock = vi.fn();
const imageLocationOverrideDeleteManyMock = vi.fn();
const auditLogCreateMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getCurrentUser }));
vi.mock("@/lib/db", () => ({
  db: {
    image: { findUnique: imageFindUniqueMock },
    tag: { findMany: tagFindManyMock },
    $transaction: transactionMock,
    auditLog: { create: auditLogCreateMock }
  }
}));

describe("PUT /api/images/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: "user-1", role: "ADMIN" });
    imageFindUniqueMock.mockResolvedValue({ id: "image-1", deletedAt: null });
    tagFindManyMock.mockResolvedValue([{ id: "tag-1" }, { id: "tag-2" }]);
    transactionMock.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        imageTag: {
          deleteMany: imageTagDeleteManyMock,
          createMany: imageTagCreateManyMock
        },
        imageLocationOverride: {
          upsert: imageLocationOverrideUpsertMock,
          deleteMany: imageLocationOverrideDeleteManyMock
        },
        auditLog: {
          create: auditLogCreateMock
        }
      })
    );
  });

  it("updates tags and manual location in one transaction", async () => {
    const { PUT } = await import("@/app/api/images/[id]/route");

    const response = await PUT(
      new Request("http://localhost/api/images/image-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagIds: ["tag-1", "tag-2"],
          location: { latitude: 35.6, longitude: 139.7, label: "Tokyo" }
        })
      }),
      { params: Promise.resolve({ id: "image-1" }) }
    );

    expect(response.status).toBe(200);
    expect(imageTagDeleteManyMock).toHaveBeenCalledWith({ where: { imageId: "image-1" } });
    expect(imageTagCreateManyMock).toHaveBeenCalledWith({
      data: [
        { imageId: "image-1", tagId: "tag-1" },
        { imageId: "image-1", tagId: "tag-2" }
      ]
    });
    expect(imageLocationOverrideUpsertMock).toHaveBeenCalled();
  });

  it("deletes manual location when payload location is null", async () => {
    const { PUT } = await import("@/app/api/images/[id]/route");

    const response = await PUT(
      new Request("http://localhost/api/images/image-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: ["tag-1"], location: null })
      }),
      { params: Promise.resolve({ id: "image-1" }) }
    );

    expect(response.status).toBe(200);
    expect(imageLocationOverrideDeleteManyMock).toHaveBeenCalledWith({
      where: { imageId: "image-1" }
    });
  });
});
```

- [ ] **Step 4: 运行接口测试，确认正确失败**

Run: `npm test -- tests/integration/image-detail-update-route.test.ts`

Expected: FAIL，提示 `PUT` 未定义或返回状态不匹配。

- [ ] **Step 5: 实现 `detail-editor` 纯函数**

```ts
export function getEditableLocationSeed(input: {
  location: { latitude: number; longitude: number; label?: string | null } | null;
  exif: { latitude?: number | null; longitude?: number | null } | null | undefined;
}) {
  // 手动位置优先，否则回退 EXIF GPS，否则返回空草稿
}

export function hasDetailDraftChanges(input: {
  initialTagIds: string[];
  draftTagIds: string[];
  initialLocation: { latitude: string; longitude: string; label: string };
  draftLocation: { latitude: string; longitude: string; label: string };
}) {
  // 比较排序后的 tagIds 与去空白后的经纬度和 label
}

export function buildDetailSavePayload(input: {
  draftTagIds: string[];
  draftLocation: { latitude: string; longitude: string; label: string };
}) {
  // 经纬度同时为空 => location:null
  // 经纬度合法 => 解析为 number，并保留可选 label
}
```

- [ ] **Step 6: 在 `src/app/api/images/[id]/route.ts` 实现聚合 `PUT`**

```ts
const updateRequestSchema = z.object({
  tagIds: z.array(z.string().min(1)),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      label: z.string().trim().max(120).optional()
    })
    .nullable()
});

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await params;
  const parsed = updateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const image = await db.image.findUnique({
    where: { id, deletedAt: null },
    include: {
      tags: { include: { tag: true } },
      location: true
    }
  });

  if (!image) {
    return NextResponse.json({ error: "未找到对应图片。" }, { status: 404 });
  }

  const tagIds = Array.from(new Set(parsed.data.tagIds));
  // 校验 tagIds 后，在 transaction 中同时更新 tags 和 location，并写审计日志
}
```

- [ ] **Step 7: 保持旧 `/tags` 与 `/location` 路由兼容**

```ts
// 选项 A：保留原逻辑，但内部调用新的共享更新方法
// 选项 B：保留现有测试，通过 route.ts 的核心实现减少重复
```

- [ ] **Step 8: 运行新增测试，确认转绿**

Run: `npm test -- tests/unit/detail-editor.test.ts tests/integration/image-detail-update-route.test.ts tests/integration/location-override.test.ts`

Expected: PASS，3 个文件全部通过。

- [ ] **Step 9: Commit**

```bash
git add tests/unit/detail-editor.test.ts tests/integration/image-detail-update-route.test.ts src/lib/images/detail-editor.ts src/app/api/images/[id]/route.ts src/app/api/images/[id]/location/route.ts src/app/api/images/[id]/tags/route.ts
git commit -m "feat: unify image detail save flow"
```

### Task 2: 图片查看器变换与关闭守卫

**Files:**
- Create: `src/lib/images/viewer-transform.ts`
- Create: `tests/unit/viewer-transform.test.ts`
- Modify: `src/components/image-detail-view.tsx`
- Modify: `src/components/image-grid.tsx`

- [ ] **Step 1: 写查看器变换失败测试**

```ts
import { describe, expect, it } from "vitest";
import {
  clampViewerOffset,
  createWheelZoomTransform,
  getViewerCursorState
} from "@/lib/images/viewer-transform";

describe("viewer transform helpers", () => {
  it("zooms around the cursor point", () => {
    expect(
      createWheelZoomTransform({
        current: { x: 0, y: 0, scale: 1 },
        nextScale: 2,
        pointer: { x: 200, y: 100 },
        viewport: { width: 800, height: 600 }
      })
    ).toEqual({ x: -200, y: -100, scale: 2 });
  });

  it("clamps offsets so the image cannot be dragged fully outside the stage", () => {
    expect(
      clampViewerOffset({
        x: 1000,
        y: -1000,
        scale: 3,
        image: { width: 1200, height: 800 },
        viewport: { width: 800, height: 600 }
      })
    ).toEqual({
      x: expect.any(Number),
      y: expect.any(Number)
    });
  });

  it("returns grab cursor only when panning is possible", () => {
    expect(getViewerCursorState({ scale: 1, imageFitsViewport: true })).toBe("default");
  });
});
```

- [ ] **Step 2: 运行测试，确认正确失败**

Run: `npm test -- tests/unit/viewer-transform.test.ts`

Expected: FAIL，提示 `viewer-transform` 模块不存在。

- [ ] **Step 3: 实现查看器辅助函数**

```ts
export function createWheelZoomTransform(...) {
  // 以鼠标点为中心计算 next x/y/scale
}

export function clampViewerOffset(...) {
  // 根据缩放后的图片尺寸限制偏移量
}

export function getViewerCursorState(...) {
  // 返回 default / grab / grabbing
}
```

- [ ] **Step 4: 重构 `image-detail-view.tsx`**

```tsx
// 1. 外层 motion 容器仅处理入场动画
// 2. 内层 stage 容器处理 translate + scale
// 3. 使用 viewer-transform 帮助函数统一 wheel / drag / reset
// 4. 引入 hasUnsavedChanges + onRequestClose 守卫
// 5. 复用 confirm dialog 或内建 detail-close confirm
```

- [ ] **Step 5: 稳定 `image-grid.tsx` 的起始 rect 采集**

```tsx
// 保存缩略图 rect 前补全 scroll 相关场景，确保 detail 页能读到准确位置
```

- [ ] **Step 6: 运行查看器辅助测试**

Run: `npm test -- tests/unit/viewer-transform.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add tests/unit/viewer-transform.test.ts src/lib/images/viewer-transform.ts src/components/image-detail-view.tsx src/components/image-grid.tsx
git commit -m "fix: restore image detail viewer interactions"
```

### Task 3: 侧栏草稿态、地图联动与统一保存

**Files:**
- Modify: `src/components/image-detail-sidebar.tsx`
- Modify: `src/components/mini-map-internal.tsx`
- Modify: `src/components/mini-map.tsx`
- Modify: `src/app/dashboard/library/[id]/page.tsx`

- [ ] **Step 1: 先让 `detail-editor` 的另一组测试失败**

```ts
it("builds a sorted tag payload and trims label", () => {
  expect(
    buildDetailSavePayload({
      draftTagIds: ["tag-2", "tag-1", "tag-1"],
      draftLocation: {
        latitude: "35.600000",
        longitude: "139.700000",
        label: " Tokyo "
      }
    })
  ).toEqual({
    tagIds: ["tag-1", "tag-2"],
    location: { latitude: 35.6, longitude: 139.7, label: "Tokyo" }
  });
});
```

- [ ] **Step 2: 运行纯函数测试，确认新增断言先失败**

Run: `npm test -- tests/unit/detail-editor.test.ts`

Expected: FAIL，payload 顺序、去重或 trim 不匹配。

- [ ] **Step 3: 完善纯函数后再改侧栏实现**

```tsx
// 侧栏状态：
const [draftTagIds, setDraftTagIds] = useState(...)
const [draftLocation, setDraftLocation] = useState(...)
const [isSaving, setIsSaving] = useState(false)
const [error, setError] = useState<string | null>(null)

const hasUnsavedChanges = hasDetailDraftChanges(...)

async function saveChanges() {
  const payload = buildDetailSavePayload(...)
  const response = await fetch(`/api/images/${imageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
}
```

- [ ] **Step 4: 重构元数据展示结构**

```tsx
// 分组为：文件信息 / 拍摄信息 / 相机与镜头 / 曝光参数 / 标签 / 地图与位置 / 更多元数据
// 没有字段时显示空值样式，不让排版塌陷
```

- [ ] **Step 5: 重构地图组件**

```tsx
// 使用 L.divIcon 创建 pin marker
// 当 props 经纬度变化时移动 marker 并 setView
// 点击地图、拖动 marker、输入框变化统一调用 onLocationChange
```

- [ ] **Step 6: 运行 `detail-editor` 与位置接口测试**

Run: `npm test -- tests/unit/detail-editor.test.ts tests/integration/image-detail-update-route.test.ts tests/integration/location-override.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/image-detail-sidebar.tsx src/components/mini-map-internal.tsx src/components/mini-map.tsx src/app/dashboard/library/[id]/page.tsx src/lib/images/detail-editor.ts tests/unit/detail-editor.test.ts
git commit -m "feat: add draft editing for image detail sidebar"
```

### Task 4: 回归验证与细节修整

**Files:**
- Modify: `src/components/image-detail-view.tsx`
- Modify: `src/components/image-detail-sidebar.tsx`
- Modify: `src/components/mini-map-internal.tsx`

- [ ] **Step 1: 运行目标测试集合**

Run: `npm test -- tests/unit/detail-editor.test.ts tests/unit/viewer-transform.test.ts tests/integration/image-detail-update-route.test.ts tests/integration/location-override.test.ts tests/unit/exif.test.ts tests/unit/location.test.ts`

Expected: PASS

- [ ] **Step 2: 运行全量测试**

Run: `npm test`

Expected: PASS，Vitest 全部通过。

- [ ] **Step 3: 启动开发服务并手工验证**

Run: `npm run dev`

Expected: 服务启动在 `http://127.0.0.1:3001`

手工检查：

- 缩略图进入详情页有放大动画
- 滚轮缩放和拖动可用
- 未保存关闭会先弹确认
- 标签与位置通过同一个按钮保存
- 经纬度输入会实时驱动地图 pin
- 标签下拉不会被地图遮挡

- [ ] **Step 4: Commit**

```bash
git add src/components/image-detail-view.tsx src/components/image-detail-sidebar.tsx src/components/mini-map-internal.tsx
git commit -m "test: verify image detail redesign"
```
