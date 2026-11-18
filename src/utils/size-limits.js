// Simple CSS lengths can be resolved without a DOM; expressions use browser layout.
export function calculateSizeLimit(value, context = {}) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const match = value
    .trim()
    .match(/^([+]?(?:\d+\.?\d*|\.\d+))(px|%|vw|vh|vmin|vmax|em|rem)?$/i);
  if (!match || (!match[2] && Number(match[1]) !== 0)) return undefined;
  const units = {
    px: 1,
    "%": context.parentSize / 100,
    vw: context.viewportWidth / 100,
    vh: context.viewportHeight / 100,
    vmin: Math.min(context.viewportWidth, context.viewportHeight) / 100,
    vmax: Math.max(context.viewportWidth, context.viewportHeight) / 100,
    em: context.fontSize,
    rem: context.rootFontSize,
  };
  const result = Number(match[1]) * units[(match[2] || "px").toLowerCase()];
  return Number.isFinite(result) ? result : undefined;
}

function createProbe(element) {
  const probe = element.ownerDocument.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;display:block;box-sizing:content-box;padding:0;border:0;margin:0;min-width:0;min-height:0;max-width:none;max-height:none;width:0;height:0;flex:none;align-self:flex-start";
  return probe;
}

export function hasDefiniteParentHeight(element) {
  const view = element.ownerDocument.defaultView;
  if (["absolute", "fixed"].includes(view.getComputedStyle(element).position))
    return true;
  const probe = createProbe(element);
  probe.style.position = "relative";
  probe.style.height = "100%";
  element.parentElement.appendChild(probe);
  try {
    // An empty percentage-height box stays zero when its parent's height is auto.
    if (parseFloat(view.getComputedStyle(probe).height) > 0) return true;
    // Distinguish an explicit zero height from an unresolved percentage (auto).
    const content = createProbe(element);
    content.style.position = "relative";
    content.style.height = "1px";
    probe.appendChild(content);
    return parseFloat(view.getComputedStyle(probe).height) === 0;
  } finally {
    probe.remove();
  }
}

export function measureSizeLimit(element, value, dimension) {
  if (typeof value !== "string") return value;
  const view = element.ownerDocument.defaultView;
  const style = view.getComputedStyle(element);
  const outOfFlow = style.position === "absolute" || style.position === "fixed";
  if (
    !outOfFlow &&
    dimension === "height" &&
    value.includes("%") &&
    !hasDefiniteParentHeight(element)
  )
    return undefined;
  const parent = outOfFlow ? element.offsetParent : element.parentElement;
  let parentSize;
  if (parent && (!outOfFlow || parent !== element.ownerDocument.body)) {
    parentSize = parent[dimension === "width" ? "clientWidth" : "clientHeight"];
    if (!outOfFlow) {
      const parentStyle = view.getComputedStyle(parent);
      const padding =
        dimension === "width"
          ? ["paddingLeft", "paddingRight"]
          : ["paddingTop", "paddingBottom"];
      parentSize -= padding.reduce(
        (sum, name) => sum + (parseFloat(parentStyle[name]) || 0),
        0
      );
    }
  }
  const result = calculateSizeLimit(value, {
    // A static body can represent the viewport rather than the containing block.
    // Let layout resolve percentages in that case, just as it resolves calc().
    parentSize,
    viewportWidth: view.innerWidth,
    viewportHeight: view.innerHeight,
    fontSize: parseFloat(style.fontSize),
    rootFontSize: parseFloat(
      view.getComputedStyle(element.ownerDocument.documentElement).fontSize
    ),
  });
  if (result !== undefined) return result;

  // Let the browser resolve calc(), min(), max(), clamp() and other CSS units.
  const probe = createProbe(element);
  probe.style.font = style.font;
  probe.style[dimension] = "";
  probe.style[dimension] = value;
  if (!probe.style[dimension] || value.trim() === "auto") return undefined;
  // Isolate expression measurement from flex/grid sizing and normal document flow.
  const container = createProbe(element);
  container.style.position = outOfFlow ? style.position : "absolute";
  container.style.contain = "strict";
  container.style[dimension] = outOfFlow ? "100%" : `${parentSize || 0}px`;
  container.appendChild(probe);
  element.parentElement.appendChild(container);
  try {
    const pixels = parseFloat(view.getComputedStyle(probe)[dimension]);
    return Number.isFinite(pixels) ? pixels : undefined;
  } finally {
    container.remove();
  }
}
