const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function constrainSize(size, min = 0, max, available = Infinity) {
  // A zero maximum has historically meant "unlimited" in this component.
  const upper = Math.min(max > 0 ? max : Infinity, Math.max(0, available));
  return clamp(size, Math.min(min, upper), upper);
}

export function calculateAxis({
  position,
  size,
  delta,
  edge,
  min = 0,
  max,
  parentSize,
  fitParent = false,
  canMove = true,
  canResize = true,
  extraSize = 0,
}) {
  if (edge === "drag" || (edge === "start" && !canResize)) {
    return {
      position: canMove
        ? fitParent
          ? clamp(
              position + delta,
              0,
              Math.max(0, parentSize - size - extraSize)
            )
          : position + delta
        : position,
      size,
    };
  }
  if (!edge || !canResize) return { position, size };

  const anchoredEnd = edge === "start" && canMove;
  const available = anchoredEnd
    ? position + size
    : parentSize - position - extraSize;
  // If the minimum cannot fit, the parent's boundary takes precedence.
  const nextSize = constrainSize(
    size + (edge === "start" ? -delta : delta),
    min,
    max,
    fitParent ? available : Infinity
  );
  return {
    position: anchoredEnd ? position + size - nextSize : position,
    size: nextSize,
  };
}

// Geometry inputs are numeric and use the parent's local coordinate system.
export function calculateRectangle({
  start,
  delta,
  direction = {},
  dragging = false,
  limits = {},
  parentSize,
  fitParent = false,
  disabledAttributes = [],
  boxSize = {},
  lockAspectRatio = false,
}) {
  if (
    lockAspectRatio &&
    !dragging &&
    start.w > 0 &&
    start.h > 0 &&
    Number.isFinite(start.w) &&
    Number.isFinite(start.h)
  )
    return calculateAspectRatioRectangle({
      start,
      delta,
      direction,
      limits,
      parentSize,
      fitParent,
      disabledAttributes,
      boxSize,
    });
  const horizontal = calculateAxis({
    position: start.l,
    size: start.w,
    delta: delta.x,
    edge: dragging ? "drag" : direction.horizontal,
    min: limits.minWidth,
    max: limits.maxWidth,
    parentSize: parentSize.width,
    fitParent,
    canMove: !disabledAttributes.includes("l"),
    canResize: !disabledAttributes.includes("w"),
    extraSize: boxSize.width,
  });
  const vertical = calculateAxis({
    position: start.t,
    size: start.h,
    delta: delta.y,
    edge: dragging ? "drag" : direction.vertical,
    min: limits.minHeight,
    max: limits.maxHeight,
    parentSize: parentSize.height,
    fitParent,
    canMove: !disabledAttributes.includes("t"),
    canResize: !disabledAttributes.includes("h"),
    extraSize: boxSize.height,
  });
  return {
    l: horizontal.position,
    t: vertical.position,
    w: horizontal.size,
    h: vertical.size,
  };
}

function calculateAspectRatioRectangle({
  start,
  delta,
  direction = {},
  limits = {},
  parentSize,
  fitParent = false,
  disabledAttributes = [],
  boxSize = {},
}) {
  if (disabledAttributes.includes("w") || disabledAttributes.includes("h"))
    return { ...start };
  const horizontal = direction.horizontal;
  const vertical = direction.vertical;
  if (!horizontal && !vertical) return { ...start };
  const dw = horizontal ? delta.x * (horizontal === "start" ? -1 : 1) : 0;
  const dh = vertical ? delta.y * (vertical === "start" ? -1 : 1) : 0;
  // Corner motion is projected onto the rectangle's original diagonal.
  const scale =
    1 +
    (horizontal && vertical
      ? (dw * start.w + dh * start.h) / (start.w ** 2 + start.h ** 2)
      : horizontal
      ? dw / start.w
      : dh / start.h);
  const anchorRight =
    horizontal === "start" && !disabledAttributes.includes("l");
  const anchorBottom =
    vertical === "start" && !disabledAttributes.includes("t");
  const availableWidth = fitParent
    ? Math.max(
        0,
        anchorRight
          ? start.l + start.w
          : parentSize.width - start.l - (boxSize.width || 0)
      )
    : Infinity;
  const availableHeight = fitParent
    ? Math.max(
        0,
        anchorBottom
          ? start.t + start.h
          : parentSize.height - start.t - (boxSize.height || 0)
      )
    : Infinity;
  const minimum = Math.max(
    0,
    (limits.minWidth || 0) / start.w,
    (limits.minHeight || 0) / start.h
  );
  const maximum = Math.min(
    limits.maxWidth > 0 ? limits.maxWidth / start.w : Infinity,
    limits.maxHeight > 0 ? limits.maxHeight / start.h : Infinity,
    availableWidth / start.w,
    availableHeight / start.h
  );
  const nextScale = clamp(scale, Math.min(minimum, maximum), maximum);
  const w = start.w * nextScale;
  const h = start.h * nextScale;
  return {
    l: anchorRight ? start.l + start.w - w : start.l,
    t: anchorBottom ? start.t + start.h - h : start.t,
    w,
    h,
  };
}

export function calculateRestoreRectangle({
  size,
  pointer,
  parentSize,
  boxSize = {},
}) {
  return {
    l:
      pointer.x > parentSize.width / 2
        ? parentSize.width - size.width - (boxSize.width || 0)
        : 0,
    t:
      pointer.y > parentSize.height / 2
        ? parentSize.height - size.height - (boxSize.height || 0)
        : 0,
    w: size.width,
    h: size.height,
  };
}
