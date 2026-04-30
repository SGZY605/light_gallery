export type ViewerTransform = {
  x: number;
  y: number;
  scale: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type ImageSize = {
  width: number;
  height: number;
};

type WheelZoomInput = {
  current: ViewerTransform;
  nextScale: number;
  pointer: {
    x: number;
    y: number;
  };
  viewport: ViewportSize;
};

type ClampInput = ViewerTransform & {
  image: ImageSize;
  viewport: ViewportSize;
};

export function createWheelZoomTransform({
  current,
  nextScale,
  pointer,
  viewport
}: WheelZoomInput): ViewerTransform {
  const scaleRatio = nextScale / current.scale;
  const pointerX = pointer.x - viewport.width / 2;
  const pointerY = pointer.y - viewport.height / 2;

  return {
    x: pointerX - (pointerX - current.x) * scaleRatio,
    y: pointerY - (pointerY - current.y) * scaleRatio,
    scale: nextScale
  };
}

export function clampViewerOffset({ x, y, scale, image, viewport }: ClampInput) {
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  const maxX = Math.max((scaledWidth - viewport.width) / 2, 0);
  const maxY = Math.max((scaledHeight - viewport.height) / 2, 0);

  return {
    x: Math.min(Math.max(x, -maxX), maxX),
    y: Math.min(Math.max(y, -maxY), maxY)
  };
}

export function getViewerCursorState({
  scale,
  imageFitsViewport,
  isDragging
}: {
  scale: number;
  imageFitsViewport: boolean;
  isDragging: boolean;
}) {
  if (scale <= 1 || imageFitsViewport) {
    return "default";
  }

  return isDragging ? "grabbing" : "grab";
}
