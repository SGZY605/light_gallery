# Dashboard Albums and Map Redesign

## Goal

Adjust the authenticated dashboard so the first screen is the existing gallery, add an albums-style aggregate browsing page, and simplify the map into a focused geospatial photo browser.

The new "相册" page is not a real album data model. It is a derived view over the existing image, tag, EXIF, and share records.

## Scope

- Remove the visible "首页" navigation entry.
- Redirect `/dashboard` to `/dashboard/library`.
- Add `/dashboard/albums` and show it as "相册" in the sidebar.
- Reorder sidebar navigation as: 图库、相册、地图、标签、上传、分享、用户、设置.
- Continue hiding "用户" from members who cannot manage users.
- Move tag/date photo filtering from the map experience into the albums page.
- Change the map page to show all visible geotagged gallery images without a filter bar.
- Keep the existing image detail route `/dashboard/library/[id]` as the single full-screen detail experience.

Out of scope:

- Creating real albums, album membership, album CRUD, or a Prisma schema change.
- Solving full application-wide per-user data isolation. This redesign should use the same authenticated dashboard visibility assumptions as the current gallery unless a shared visibility helper already exists during implementation.

## Navigation And Routing

`/dashboard` becomes a server redirect to `/dashboard/library`. The old overview content is removed from the user-facing route.

`DashboardNav` renders the new order:

1. `/dashboard/library` - 图库
2. `/dashboard/albums` - 相册
3. `/dashboard/map` - 地图
4. `/dashboard/tags` - 标签
5. `/dashboard/upload` - 上传
6. `/dashboard/shares` - 分享
7. `/dashboard/users` - 用户, manager-only
8. `/dashboard/settings` - 设置

Navigation active-state logic can keep the existing prefix behavior. No special home-route branch is needed once the home item is removed, although existing tests can still cover the utility if the helper remains generic.

## Albums Page

Route: `/dashboard/albums`

The page has a compact dashboard-style layout:

- First row: statistic cards.
- Second row: two view toggle buttons for 筛选视图 and 时间线视图.
- Main area: the active view content.

View state is stored in the URL as `view=filter` or `view=timeline`. Invalid or missing values default to `filter`.

### Statistics

The first row shows:

- 照片总数: count of non-deleted images in the current gallery visibility scope.
- 标签数量: count of tags available in the current dashboard visibility scope.
- 活跃分享链接: shares where `revoked = false` and `expiresAt` is null or later than now.
- 有拍摄时间: count of non-deleted images with `exif.takenAt`.

These stats are intentionally derived from current data. They do not require storing album summaries.

### Shared Thumbnail Behavior

Both album views use the same square thumbnail component:

- Fixed square aspect ratio.
- Consistent size across filter and timeline views.
- Uses existing OSS thumbnail URL generation.
- Click stores the thumbnail rect and return URL in `sessionStorage`, then navigates to `/dashboard/library/[id]`.
- The return URL includes the current `/dashboard/albums` query string so closing detail returns to the same albums view.

### Filter View

The filter view reuses the map page's current filtering capability, but in an albums-specific UI:

- Tag filtering supports selecting one or more tags.
- Date filtering supports start date and end date.
- Date comparisons use the image's display date: `exif.takenAt` first, then `createdAt` when no capture time exists.
- Filtered results render as a square thumbnail grid.

Filter state should also live in the URL, using query params such as:

- `tag=<tagId>` repeated for multiple tags.
- `from=YYYY-MM-DD`
- `to=YYYY-MM-DD`
- `view=filter`

### Timeline View

The timeline view groups images by display date, sorted descending. The display date is:

1. `exif.takenAt` when present.
2. `createdAt` when no capture time is available.

Each group represents one calendar day in local display format:

- The left side shows a vertical timeline.
- Each date with photos has a solid dot on the timeline.
- The dot's right side shows a simple `YYYY-MM-DD` label.
- Photos from that date render to the right of the timeline node.
- Groups nearer the top are closer to the current date; older groups appear lower.

Images without EXIF capture time are not dropped. They degrade gracefully to upload time for sorting, grouping, and the visible date label.

## Map Page

Route: `/dashboard/map`

The map no longer renders a filter section. It queries all non-deleted, visible gallery images that have an effective location from either manual override or EXIF GPS.

The page layout becomes a focused map workspace:

- Left: Leaflet map, responsive width, fills the available page height.
- Right: selected photo panel, about 360-420px on large screens.
- Small screens stack the map and panel vertically.
- The map container avoids a fixed `620px` height and instead uses dashboard shell height constraints with `min-h-0`.

### Map Markers

Markers become tiny square photo thumbnails instead of count circles.

Implementation notes:

- Each geotagged image should be selectable as its own marker.
- Images with identical or very close coordinates should not become impossible to click. A small deterministic offset can be applied within a location group.
- The marker thumbnail uses the OSS `thumb` variant.
- Clicking a thumbnail selects that image and updates the right panel.

### Selected Photo Panel

The right panel keeps the current "位置面板" role, but changes its content from location groups to one selected image.

It displays:

- Larger square thumbnail.
- Filename.
- Capture time when available.
- Upload time.
- Tags.
- Coordinate source: manual override or EXIF GPS.
- Latitude and longitude.
- Optional location label.

Clicking the larger panel thumbnail navigates to `/dashboard/library/[id]`, stores the panel thumbnail rect for the existing detail transition, and stores `/dashboard/map` as the return URL.

If no geotagged images exist, the map area remains visible and the panel shows an empty state.

## Data Flow

Server pages fetch records and normalize them into client-friendly DTOs.

Albums page fetches:

- Image list with `exif` and `tags`.
- Tags sorted by name.
- Stat counts.
- Active share count.

Map page fetches:

- Image list with `exif`, `location`, and `tags`.
- Effective location resolved through `resolveEffectiveLocation`.
- OSS public base URL if needed by client components.

Client components own only UI state:

- Albums filter controls update URL query params.
- Albums view toggle updates `view`.
- Map selected image is local client state.

## Error Handling And Empty States

- Albums stats show zero values when there are no images, tags, or active shares.
- Filter view shows a neutral empty state when no images match.
- Timeline view shows a neutral empty state when there are no visible images.
- Map page shows an empty panel state when there are no geotagged images.
- Invalid date query params are ignored rather than causing route errors.

## Testing

Add or update focused tests for:

- Navigation no longer includes 首页 and uses the requested order.
- Members do not see 用户 while managers do.
- `/dashboard` redirects to `/dashboard/library`.
- Albums timeline display date falls back from `exif.takenAt` to `createdAt`.
- Albums filter date logic uses the same display-date fallback.
- Map explorer no longer renders tag/date filters.
- Map markers use thumbnail image data instead of count-circle content.

Run:

- `npm test`
- `npm run lint`

For visual verification, start the dev server and check:

- `/dashboard` lands on `/dashboard/library`.
- `/dashboard/albums` filter and timeline views render square thumbnails.
- `/dashboard/map` fills the page height and selecting a map thumbnail updates the right panel.
