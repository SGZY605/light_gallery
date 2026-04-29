# Dashboard 外壳控制实施计划

> **给自动化执行者的要求：**按步骤执行并保留测试证据。所有说明文档继续使用中文。

**目标：**实现 dashboard 导航精确高亮、深浅色切换、宽窄布局切换和更窄侧栏。

**架构：**把纯规则放入 `src/components/dashboard-shell-state.ts`，方便单元测试；`DashboardShellControls` 负责客户端主题和布局状态；`DashboardNav` 只负责导航渲染和高亮；`dashboard/layout.tsx` 负责服务端用户信息和外壳组合。

**技术栈：**Next.js 15、React 18、Tailwind CSS、lucide-react、Vitest、Playwright smoke。

---

### 任务 1：纯规则测试

**文件：**
- 新建：`tests/unit/dashboard-shell-state.test.ts`
- 新建：`src/components/dashboard-shell-state.ts`

- [x] **步骤 1：编写失败测试**

覆盖：
- `/dashboard/library` 不会高亮 `/dashboard`
- `/dashboard` 会高亮首页
- `/dashboard/library/abc` 会高亮图库
- 无效主题回退到 `dark`
- 无效布局回退到 `wide`

- [x] **步骤 2：运行测试并确认失败**

运行：`npm test -- tests/unit/dashboard-shell-state.test.ts`

预期：模块不存在或函数不存在导致失败。

- [x] **步骤 3：实现纯规则**

导出 `isNavigationItemActive`、`resolveThemeMode`、`resolveLayoutMode`。

- [x] **步骤 4：运行测试并确认通过**

运行：`npm test -- tests/unit/dashboard-shell-state.test.ts`

预期：测试通过。

### 任务 2：组件和样式

**文件：**
- 修改：`src/components/dashboard-nav.tsx`
- 新建：`src/components/dashboard-shell-controls.tsx`
- 修改：`src/app/dashboard/layout.tsx`
- 修改：`src/app/layout.tsx`
- 修改：`src/app/globals.css`
- 修改：`tailwind.config.ts`

- [x] **步骤 1：接入导航高亮规则**

`DashboardNav` 使用 `isNavigationItemActive`，让首页只精确匹配。

- [x] **步骤 2：新增控制按钮组件**

`DashboardShellControls` 在客户端读取 `localStorage`，默认主题为 `dark`，默认布局为 `wide`，并写入 `document.documentElement` 和 dashboard 根节点的数据属性。

- [x] **步骤 3：调整布局**

侧栏宽度改为 `xl:w-44`；主容器默认宽模式，窄模式使用 `max-w-[1500px]`。

- [x] **步骤 4：调整主题变量和覆盖规则**

使用 CSS 变量控制背景、文字、边框、卡片，并为 dashboard 中的 `text-white/*`、`border-white/*`、`bg-black/*` 提供主题化覆盖。

### 任务 3：验证和提交

**文件：**
- 验证全部变更。

- [x] **步骤 1：运行自动化检查**

运行：`npm test` 和 `npm run lint`。

- [x] **步骤 2：浏览器验证**

启动 dev server，访问 dashboard，验证导航高亮、主题切换、宽窄模式和 HTTP 200。

- [ ] **步骤 3：提交**

确认 git 状态后提交变更。
