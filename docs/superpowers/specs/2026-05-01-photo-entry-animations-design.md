# Photo Entry Animations Design

## Goal

Improve the first impression of image-heavy pages by adding a deliberate entry animation when users refresh or navigate into the gallery and albums views.

The animation should make photos feel like they are loading into place instead of appearing abruptly or stuttering. The behavior is intentionally visual only: it must not change filtering, routing, image sizing, detail navigation, hover overlays, album grouping, or data loading.

## Confirmed Direction

The user selected two different motion treatments:

- Gallery waterfall grid: use option B, a waterfall-style staggered fade-in.
- Albums pages: use option A, a softer staggered fade-in.

## Current Context

The gallery grid is rendered by `src/components/image-grid.tsx`. It already uses a CSS column layout for the waterfall grid and stores the clicked tile rectangle in `sessionStorage` before navigating to the image detail route.

Album thumbnails are centralized in `src/components/album-photo-tile.tsx`. The albums overview, filter grid, timeline grid, memory previews, favorites preview, favorites page, and memory detail page can share the same motion language through this tile component.

The app already uses CSS transitions for image hover states and has `framer-motion` available, but this change does not require a runtime animation dependency. CSS keyframes are enough and keep the change small.

## Design

### Gallery Waterfall Animation

Each gallery tile should animate when `ImageGrid` mounts:

- Start with low opacity, slight downward offset, subtle scale reduction, and a light blur.
- End at full opacity, original position, full scale, and no blur.
- Use an emphasized but controlled easing curve so the grid reads as flowing into place.
- Stagger tiles by image index using a CSS custom property, with a bounded delay so large galleries do not keep animating for too long.

The animation belongs on the tile wrapper or button frame, while the existing hover zoom remains on the internal `Image` element. This preserves the current hover behavior and metadata overlay.

### Albums Thumbnail Animation

Each `AlbumPhotoTile` should animate when it mounts:

- Start with low opacity, small downward offset, very slight scale reduction, and minimal blur.
- End at full opacity, original position, full scale, and no blur.
- Use a shorter stagger and gentler movement than the gallery.

The album animation should feel quiet because album views include dense square grids and preview mosaics. It should improve perceived smoothness without drawing attention away from the photos.

### Stagger Inputs

`ImageGrid` already has access to the image index in its `map`, so it can set `--entry-index` directly on each gallery tile.

`AlbumPhotoTile` should accept an optional `entryIndex` prop. Call sites that render lists should pass their local index. Single hero tiles and existing call sites without an index should default to zero so the component remains easy to reuse.

## Accessibility And Performance

Add a `prefers-reduced-motion: reduce` rule that disables the entry keyframes and removes transform/filter changes for both animation classes.

The animation should use only `opacity`, `transform`, and a small `filter: blur(...)` during entry. Delays should be capped with `min()` or equivalent CSS so large grids do not create excessive trailing motion.

No JavaScript timers, intersection observers, or client-side state are required. The animation should replay naturally on every page refresh or remount.

## Testing Strategy

Use existing source-contract style unit tests because this is a narrow presentation change:

- `image-grid` tests should assert the gallery tile has the new waterfall entry class and index-based CSS variable.
- album tests should assert `AlbumPhotoTile` exposes the softer entry class, supports `entryIndex`, and album list call sites pass indexes.
- global style tests should assert both keyframes/classes exist and `prefers-reduced-motion` disables the entry animation.

Manual verification should include refreshing the gallery and albums pages in a browser and confirming that hover zoom, metadata overlays, and detail-route navigation still work.

## Out Of Scope

- Changing image data fetching or loading priority.
- Replacing the gallery waterfall layout.
- Reworking album grouping, filters, or memory highlight logic.
- Adding persistent animation preferences.
- Introducing new animation libraries for this change.
