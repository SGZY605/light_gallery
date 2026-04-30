# 图库列数偏好持久化设计

## 目标

在已经实现的图库列数控制基础上，新增账号级持久化能力。

本次设计需要满足：

- 同一用户在图库页调整过列数后，离开页面再返回 `/dashboard/library` 时仍保持上次保存的列数
- 偏好按账号保存，不是按浏览器或设备保存
- 前端拖动滑块时图片网格仍然实时更新
- 持久化写入只在用户停止操作后触发，不在滑动过程中的每个中间值都写数据库
- 保存失败不打断当前 UI，当前页面继续按本地列数显示
- 所有保存值继续限制在 `3..8`

## 当前状态

现有图库列数控制已经完成以下行为：

- `User` 尚未保存任何图库列数偏好
- `DashboardLibraryPage` 作为服务端入口，负责取数并渲染 `LibraryPageShell`
- `LibraryPageShell` 当前通过 `useState(DEFAULT_LIBRARY_COLUMN_COUNT)` 初始化列数
- `ImageGrid` 已经支持受控 `columnCount`
- `clampLibraryColumnCount()` 已经统一列数边界为 `3..8`

这意味着当前列数只存在于一次页面生命周期内。用户从别的页面返回图库页时，会重新回到默认值 `4`。

## 核心决策

### 1. 把列数偏好直接挂到 `User`

本次不引入新的偏好表，而是在 `User` 模型上新增：

- `libraryColumnCount Int @default(4)`

原因：

- 这次只需要保存一个稳定且明确的账号级整数偏好
- 读取当前用户时可以直接拿到，不需要额外 join 或查询新的偏好表
- 相比 `SystemSetting` JSON 或单独 `UserPreference` 表，结构更轻，类型更清晰

### 2. 服务端以用户偏好作为初始列数来源

`DashboardLibraryPage` 在拿到当前用户后，直接读取 `user.libraryColumnCount`，并把它作为 `initialColumnCount` 传给 `LibraryPageShell`。

这样：

- 首次进入图库页时就是上次保存的列数
- 从其他页面跳回图库页时也会延续这个列数
- 不需要依赖 `localStorage`、URL 或客户端缓存恢复状态

### 3. 客户端仍然立即响应，但持久化延后写入

`LibraryPageShell` 继续维护本地 `columnCount`，因为滑块拖动时需要即时刷新 `ImageGrid`。

新增行为：

- 本地状态变化时，UI 立即更新
- 经过短暂 debounce 后，向后端发送一次保存请求
- 只保存最后稳定下来的列数，而不是滑动过程中的每一个中间值

这能保持现有交互流畅，同时避免频繁写库。

### 4. 持久化入口使用轻量 API route

本次新增一个很小的 API route，例如：

- `src/app/api/users/library-preference/route.ts`

职责只包括：

- 校验当前用户已登录
- 读取请求体中的列数值
- 通过 `clampLibraryColumnCount()` 归一化为合法值
- 只更新当前用户自己的 `libraryColumnCount`
- 返回最终保存值

之所以选 API route，而不是 server action：

- 这是纯客户端交互，不是表单提交
- 仓库现有客户端更新场景已经广泛使用 `fetch("/api/...")`
- debounce 后直接调用 API route 更自然，也更容易控制失败兜底

### 5. 保存失败不回滚 UI

如果保存请求失败：

- 不回退当前页面上的 `columnCount`
- 不阻断用户继续浏览图库
- 不新增 toast 或显式错误提示

这次把偏好保存定义为“安静的增强能力”。用户当前操作体验优先，数据库同步次之。

真正的状态来源规则是：

- 当前页面显示：本地最新列数
- 下次重新进入图库页：数据库中最后一次成功保存的列数

## 数据模型

### `User`

新增字段：

- `libraryColumnCount Int @default(4)`

约束要求：

- 数据库层有默认值 `4`
- 应用层写入前统一 clamp 到 `3..8`

### 迁移同步

需要同步更新：

- `prisma/schema.prisma`
- `prisma/pre-schema-sync.sql`

已有用户在升级后，如果没有旧数据来源，直接使用默认值 `4` 即可。

## 组件与职责

### `DashboardLibraryPage`

继续保留服务端职责：

- 读取搜索参数
- 查询图片与标签
- 解析 OSS 配置
- 读取当前用户 `libraryColumnCount`
- 把 `initialColumnCount` 传给 `LibraryPageShell`

### `LibraryPageShell`

从“客户端临时状态容器”调整为“客户端临时状态 + 延迟持久化容器”，职责为：

- 使用 `initialColumnCount` 初始化本地列数
- 渲染左上角列数控件
- 渲染右上角筛选栏
- 将列数传给 `ImageGrid`
- 在列数变化停止后调用保存 API

`LibraryPageShell` 不负责 clamp 规则定义，只复用现有 helper。

### 新增偏好保存 API

职责为：

- 身份校验
- 请求体验证
- 列数 clamp
- 仅更新当前用户自己的偏好
- 返回最终保存值

不负责：

- 返回整页数据
- 触发图库查询
- 处理其他偏好项

## 数据与状态流

1. 用户进入 `/dashboard/library`
2. 服务端读取当前用户记录中的 `libraryColumnCount`
3. `DashboardLibraryPage` 把该值作为 `initialColumnCount` 传给 `LibraryPageShell`
4. `LibraryPageShell` 用这个初始值渲染 `ImageGrid`
5. 用户拖动滑块时，本地 `columnCount` 立即变化，图片网格实时更新
6. 用户停止操作后，客户端 debounce 触发一次保存请求
7. 后端校验登录身份并 clamp 值后，更新当前用户的 `libraryColumnCount`
8. 用户未来再次进入图库页时，服务端重新读取这个保存值并恢复布局

## 交互与保存策略

### 即时反馈

- 滑块拖动过程不变
- 网格布局继续实时更新

### 延迟保存

- 每次本地列数变更后，重置保存计时
- 只有在短时间内没有继续变化时，才发送保存请求

本次设计只要求“停止操作后再保存”，不强制规定必须是 `pointerup` 还是固定毫秒 debounce。
实现时以最贴合现有组件结构、最稳定的方式为准，但必须满足“非每帧写库”的边界。

### 页面切换语义

- 当前页内：以本地状态为准
- 离开后再返回：以数据库中最后一次成功保存的值为准

## 错误处理

- 未登录请求返回 `401`
- 非法列数值在后端统一 clamp，不把请求判为失败
- 保存接口只允许修改当前登录用户自己的偏好，不接受用户 ID 作为外部输入
- 保存失败时前端静默忽略，不影响当前本地布局状态

## 测试策略

### 单元测试

继续覆盖：

- 默认值 `4`
- 最小值 `3`
- 最大值 `8`
- 非法值回退和 clamp 行为

### 契约测试

补充验证：

- `DashboardLibraryPage` 将 `user.libraryColumnCount` 传给 `LibraryPageShell`
- `LibraryPageShell` 使用 `initialColumnCount`
- `LibraryPageShell` 包含偏好保存请求逻辑
- 偏好保存 API 通过 `requireUser()` 或等价逻辑限定当前用户

### API 测试

补充验证：

- 未登录时拒绝保存
- 越界值会被 clamp 后保存
- 只更新当前用户自己的 `libraryColumnCount`
- 返回值是最终保存后的合法列数

### 回归验证

保持：

- 已有图库列数控件测试
- 分享页相关测试
- `npm run build`

## 实施边界

主要改动范围：

- `prisma/schema.prisma`
- `prisma/pre-schema-sync.sql`
- `src/app/dashboard/library/page.tsx`
- `src/components/library-page-shell.tsx`
- 新增图库列数偏好保存 API
- 相关单测与集成测试

本次不做：

- 通用用户偏好系统
- 设置页中的“默认列数”可视化配置
- 浏览器本地存储兜底
- 跨标签页实时同步列数
- 其他页面复用该偏好
