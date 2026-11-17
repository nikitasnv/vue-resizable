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
}) {
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
