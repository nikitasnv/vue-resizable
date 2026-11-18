<template>
  <div
    ref="parent"
    class="resizable-component"
    :style="style"
    @pointerdown="handleDown"
  >
    <slot />
    <div
      v-for="el in active"
      v-show="!maximize"
      :key="el"
      class="resizable-handle"
      :class="'resizable-' + el"
    />
  </div>
</template>

<script>
import {
  calculateRectangle,
  calculateRestoreRectangle,
  calculateResizeSteps,
  constrainSize,
  isValidResizeStep,
} from "../utils/geometry";
import { shouldCancelDrag } from "../utils/drag";
import {
  hasDefiniteParentHeight,
  measureSizeLimit,
} from "../utils/size-limits";

const HANDLES = {
  "resizable-r": { horizontal: "end", cursor: "e-resize" },
  "resizable-rb": { horizontal: "end", vertical: "end", cursor: "se-resize" },
  "resizable-b": { vertical: "end", cursor: "s-resize" },
  "resizable-lb": { horizontal: "start", vertical: "end", cursor: "sw-resize" },
  "resizable-l": { horizontal: "start", cursor: "w-resize" },
  "resizable-lt": {
    horizontal: "start",
    vertical: "start",
    cursor: "nw-resize",
  },
  "resizable-t": { vertical: "start", cursor: "n-resize" },
  "resizable-rt": { horizontal: "end", vertical: "start", cursor: "ne-resize" },
  "drag-el": { cursor: "pointer" },
};

const CALC_MASK = {
  l: 0b0001,
  t: 0b0010,
  w: 0b0100,
  h: 0b1000,
};

const SIZE_LIMITS = {
  minWidth: "width",
  maxWidth: "width",
  minHeight: "height",
  maxHeight: "height",
};

export default {
  name: "VResizable",
  props: {
    width: {
      default: undefined,
      type: [Number, String],
    },
    minWidth: {
      default: 0,
      type: [Number, String],
    },
    maxWidth: {
      default: undefined,
      type: [Number, String],
    },
    height: {
      default: undefined,
      type: [Number, String],
    },
    minHeight: {
      default: 0,
      type: [Number, String],
    },
    maxHeight: {
      default: undefined,
      type: [Number, String],
    },
    left: {
      default: 0,
      type: [Number, String],
    },
    top: {
      default: 0,
      type: [Number, String],
    },
    active: {
      default: () => ["r", "rb", "b", "lb", "l", "lt", "t", "rt"],
      validator: (val) =>
        ["r", "rb", "b", "lb", "l", "lt", "t", "rt"].filter(
          (value) => val.indexOf(value) !== -1
        ).length === val.length,
      type: Array,
    },
    fitParent: {
      default: false,
      type: Boolean,
    },
    lockAspectRatio: {
      default: false,
      type: Boolean,
    },
    step: {
      default: 0,
      type: [Number, String],
      validator: isValidResizeStep,
    },
    dragSelector: {
      default: undefined,
      type: String,
    },
    dragCancelSelector: {
      default: undefined,
      type: String,
    },
    maximize: {
      default: false,
      type: Boolean,
    },
    disableAttributes: {
      default: () => [],
      validator: (val) =>
        ["l", "t", "w", "h"].filter((value) => val.indexOf(value) !== -1)
          .length === val.length,
      type: Array,
    },
  },
  emits: [
    "mount",
    "destroy",
    "resize:start",
    "resize:move",
    "resize:end",
    "drag:start",
    "drag:move",
    "drag:end",
    "maximize",
  ],
  data() {
    return {
      w: this.width,
      h: this.height,
      l: this.left,
      t: this.top,
      prevState: null,
      interaction: null,
      dragElements: [],
      ownedDragElements: [],
      dragObserver: null,
      sizeObserver: null,
      resolvedLimits: {},
      limitParentSize: null,
    };
  },
  computed: {
    minW() {
      return typeof this.minWidth === "string"
        ? this.resolvedLimits.minWidth ?? 0
        : this.minWidth;
    },
    minH() {
      return typeof this.minHeight === "string"
        ? this.resolvedLimits.minHeight ?? 0
        : this.minHeight;
    },
    maxW() {
      return typeof this.maxWidth === "string"
        ? this.resolvedLimits.maxWidth
        : this.maxWidth;
    },
    maxH() {
      return typeof this.maxHeight === "string"
        ? this.resolvedLimits.maxHeight
        : this.maxHeight;
    },
    limits() {
      return {
        minWidth: this.minW,
        maxWidth: this.maxW,
        minHeight: this.minH,
        maxHeight: this.maxH,
      };
    },
    calcMap() {
      return this.disableAttributes.reduce(
        (mask, attr) => mask & ~CALC_MASK[attr],
        0b1111
      );
    },
    style() {
      const style = {};
      for (const [attr, name] of Object.entries({
        w: "width",
        h: "height",
        l: "left",
        t: "top",
      })) {
        if (this.calcMap & CALC_MASK[attr]) {
          style[name] =
            typeof this[attr] === "number" ? `${this[attr]}px` : this[attr];
          const maximum = { w: this.maxW, h: this.maxH }[attr];
          if (
            this[attr] === "auto" &&
            !this.maximize &&
            (attr === "w" || attr === "h")
          ) {
            const horizontal = attr === "w";
            const minimum = horizontal ? this.minW : this.minH;
            const position = horizontal ? this.l : this.t;
            const available =
              this.fitParent && this.limitParentSize
                ? this.limitParentSize[name] -
                  (typeof position === "number"
                    ? position
                    : this.readGeometry(horizontal ? "l" : "t")) -
                  this.measureBoxSize()[name]
                : Infinity;
            const lower = constrainSize(minimum, 0, maximum, available);
            const upper = constrainSize(Infinity, 0, maximum, available);
            if (lower > 0)
              style[horizontal ? "minWidth" : "minHeight"] = `${lower}px`;
            if (Number.isFinite(upper))
              style[horizontal ? "maxWidth" : "maxHeight"] = `${upper}px`;
          }
        }
      }
      return style;
    },
  },
  watch: {
    minWidth: "setupSizeLimits",
    minHeight: "setupSizeLimits",
    maxWidth: "setupSizeLimits",
    maxHeight: "setupSizeLimits",
    limits: {
      handler(value, previous) {
        const target = this.prevState || this;
        if (
          value.minWidth !== previous.minWidth ||
          value.maxWidth !== previous.maxWidth
        )
          this.updateGeometry("w", target.w, true);
        if (
          value.minHeight !== previous.minHeight ||
          value.maxHeight !== previous.maxHeight
        )
          this.updateGeometry("h", target.h, true);
      },
      // Normalize against the complete geometry prop batch, including coordinates.
      flush: "post",
    },
    width(value) {
      this.updateGeometry("w", value);
    },
    height(value) {
      this.updateGeometry("h", value);
    },
    left(value) {
      this.updateGeometry("l", value);
    },
    top(value) {
      this.updateGeometry("t", value);
    },
    dragSelector: {
      handler(selector) {
        this.setupDragElements(selector);
      },
      flush: "post",
    },
    maximize(value) {
      this.setMaximize(value);
      this.emitEvent("maximize", { state: value });
    },
  },
  mounted() {
    this.setupSizeLimits();
    this.w = constrainSize(
      this.width == null
        ? this.$el.parentElement.clientWidth
        : typeof this.width === "number"
        ? this.width
        : this.readGeometry("w"),
      this.minW,
      this.maxW
    );
    this.h = constrainSize(
      this.height == null
        ? this.$el.parentElement.clientHeight
        : typeof this.height === "number"
        ? this.height
        : this.readGeometry("h"),
      this.minH,
      this.maxH
    );
    if (this.width === "auto") this.w = "auto";
    if (this.height === "auto") this.h = "auto";
    if (typeof this.left !== "number") this.l = this.readGeometry("l");
    if (typeof this.top !== "number") this.t = this.readGeometry("t");
    this.setMaximize(this.maximize);
    this.setupDragElements(this.dragSelector);
    this.dragObserver = new MutationObserver(() =>
      this.setupDragElements(this.dragSelector)
    );
    this.dragObserver.observe(this.$el, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    this.emitEvent("mount");
  },
  beforeUnmount() {
    this.sizeObserver?.disconnect();
    window.removeEventListener("resize", this.refreshSizeLimits);
    this.dragObserver.disconnect();
    this.ownedDragElements.forEach((el) =>
      el.removeAttribute("data-resizable-drag")
    );
    this.finishInteraction(false);
    this.emitEvent("destroy");
  },
  methods: {
    refreshSizeLimits() {
      this.limitParentSize = {
        width: this.$el.parentElement.clientWidth,
        height:
          this.h === "auto" && !hasDefiniteParentHeight(this.$el)
            ? Infinity
            : this.$el.parentElement.clientHeight,
      };
      this.resolvedLimits = Object.fromEntries(
        Object.entries(SIZE_LIMITS).map(([name, dimension]) => [
          name,
          measureSizeLimit(this.$el, this[name], dimension),
        ])
      );
    },
    setupSizeLimits() {
      this.refreshSizeLimits();
      if (
        Object.keys(SIZE_LIMITS).some((name) => typeof this[name] === "string")
      ) {
        window.addEventListener("resize", this.refreshSizeLimits);
        if (!this.sizeObserver && window.ResizeObserver) {
          this.sizeObserver = new window.ResizeObserver(this.refreshSizeLimits);
          this.sizeObserver.observe(this.$el.parentElement);
          if (
            this.$el.offsetParent &&
            this.$el.offsetParent !== this.$el.parentElement
          )
            this.sizeObserver.observe(this.$el.offsetParent);
        }
      } else {
        window.removeEventListener("resize", this.refreshSizeLimits);
        this.sizeObserver?.disconnect();
        this.sizeObserver = null;
      }
    },
    measureBoxSize() {
      const style = window.getComputedStyle(this.$el);
      if (style.boxSizing === "border-box") return { width: 0, height: 0 };
      const sum = (names) =>
        names.reduce(
          (total, name) => total + (parseFloat(style[name]) || 0),
          0
        );
      return {
        width: sum([
          "paddingLeft",
          "paddingRight",
          "borderLeftWidth",
          "borderRightWidth",
        ]),
        height: sum([
          "paddingTop",
          "paddingBottom",
          "borderTopWidth",
          "borderBottomWidth",
        ]),
      };
    },
    readGeometry(attr) {
      const name = { w: "width", h: "height", l: "left", t: "top" }[attr];
      const value = parseFloat(window.getComputedStyle(this.$el)[name]);
      if (Number.isFinite(value)) return value;
      return attr === "w"
        ? this.$el.clientWidth
        : attr === "h"
        ? this.$el.clientHeight
        : 0;
    },
    updateGeometry(attr, value, force = false) {
      // Echoed event values must not overwrite the saved, non-maximized geometry.
      if (!force && this[attr] === value) return;
      const target = this.prevState || this;
      const normalize = (size) => {
        if (attr !== "w" && attr !== "h") return size;
        // A size and CSS limits can change together, before their watchers run.
        if (
          !force &&
          Object.keys(SIZE_LIMITS).some(
            (name) => typeof this[name] === "string"
          )
        )
          this.refreshSizeLimits();
        const horizontal = attr === "w";
        const positionAttr = horizontal ? "l" : "t";
        const available =
          force && this.fitParent && target === this
            ? this.$el.parentElement[
                horizontal ? "clientWidth" : "clientHeight"
              ] -
              (typeof this[positionAttr] === "number"
                ? this[positionAttr]
                : this.readGeometry(positionAttr)) -
              this.measureBoxSize()[horizontal ? "width" : "height"]
            : Infinity;
        return constrainSize(
          size,
          horizontal ? this.minW : this.minH,
          horizontal ? this.maxW : this.maxH,
          available
        );
      };
      const next = typeof value === "number" ? normalize(value) : value;
      const changed = target[attr] !== next;
      target[attr] = next;
      if (target === this && attr === "h" && value === "auto")
        this.refreshSizeLimits();
      if (
        target === this &&
        changed &&
        (!force || !this.interaction?.restoring)
      )
        this.finishInteraction(true, true);
      if (
        target === this &&
        typeof value === "string" &&
        !(value === "auto" && (attr === "w" || attr === "h"))
      ) {
        this.$nextTick(() => {
          if (!this.$.isUnmounted && this[attr] === value)
            this[attr] = normalize(this.readGeometry(attr));
        });
      }
    },
    setMaximize(value) {
      // Feedback after dragging out of maximize must keep that drag active.
      if (value || this.prevState) this.finishInteraction(true);
      if (value) {
        if (!this.prevState)
          this.prevState = { w: this.w, h: this.h, l: this.l, t: this.t };
        this.t = this.l = 0;
        const boxSize = this.measureBoxSize();
        this.w = Math.max(
          0,
          this.$el.parentElement.clientWidth - boxSize.width
        );
        this.h = Math.max(
          0,
          this.$el.parentElement.clientHeight - boxSize.height
        );
      } else {
        this.restoreSize();
      }
    },
    restoreSize() {
      if (this.prevState) {
        const saved = this.prevState;
        this.prevState = null;
        Object.entries(saved).forEach(([attr, value]) =>
          this.updateGeometry(attr, value, true)
        );
      }
    },
    setupDragElements(selector) {
      const elements = selector
        ? Array.from(this.$el.querySelectorAll(selector))
        : [];
      if (selector && this.$el.matches(selector)) elements.unshift(this.$el);
      const next = elements.filter(
        (el) => el.closest(".resizable-component") === this.$el
      );
      this.ownedDragElements = this.ownedDragElements.filter((el) => {
        if (next.includes(el)) return true;
        el.removeAttribute("data-resizable-drag");
        return false;
      });
      next.forEach((el) => {
        if (!el.hasAttribute("data-resizable-drag")) {
          el.setAttribute("data-resizable-drag", "");
          if (!this.ownedDragElements.includes(el))
            this.ownedDragElements.push(el);
        }
      });
      this.dragElements = next;
      // Ignore our own marker mutations; external changes are already reflected in next.
      this.dragObserver?.takeRecords();
    },
    emitEvent(eventName, additionalOptions) {
      this.$emit(eventName, {
        eventName,
        left: this.l,
        top: this.t,
        width: this.w,
        height: this.h,
        cmp: this,
        ...additionalOptions,
      });
    },
    measureRectangle() {
      const read = (attr) =>
        typeof this[attr] === "number" && this.calcMap & CALC_MASK[attr]
          ? this[attr]
          : this.readGeometry(attr);
      return {
        l: read("l"),
        t: read("t"),
        w: read("w"),
        h: read("h"),
      };
    },
    handleDown(event) {
      if (this.interaction || event.button !== 0 || event.isPrimary === false)
        return;
      const target = event.target;
      if (
        !target.closest ||
        target.closest(".resizable-component") !== this.$el
      )
        return;
      const handle = Array.from(this.$el.children).find(
        (el) => el.classList.contains("resizable-handle") && el.contains(target)
      );
      const handleClass =
        handle &&
        Object.keys(HANDLES).find((name) => handle.classList.contains(name));
      const dragElement =
        this.dragSelector && target.closest(this.dragSelector);
      const dragging =
        !handleClass && dragElement && this.$el.contains(dragElement);
      if (dragging && shouldCancelDrag(target, this.dragCancelSelector)) return;
      if ((!handleClass && !dragging) || (this.maximize && !dragging)) return;
      if (event.cancelable) event.preventDefault();
      const rect = this.$el.getBoundingClientRect();
      const rectangle = this.measureRectangle();
      const parentSize = {
        width: this.$el.parentElement.clientWidth,
        height: this.$el.parentElement.clientHeight,
      };
      if (!dragging) {
        if (this.calcMap & CALC_MASK.w) this.w = rectangle.w;
        if (this.calcMap & CALC_MASK.h) this.h = rectangle.h;
      }
      this.interaction = {
        pointerId: event.pointerId,
        dragging: Boolean(dragging),
        direction: {
          horizontal: HANDLES[handleClass || "drag-el"].horizontal,
          vertical: HANDLES[handleClass || "drag-el"].vertical,
        },
        x: event.clientX,
        y: event.clientY,
        scaleX: rect.width / this.$el.offsetWidth || 1,
        scaleY: rect.height / this.$el.offsetHeight || 1,
        rectangle,
        lockAspectRatio: this.lockAspectRatio,
        step: calculateResizeSteps(this.step, parentSize),
        boxSize: this.measureBoxSize(),
        parentWidth: parentSize.width,
        parentHeight: parentSize.height,
        cursor: document.body.style.cursor,
      };
      document.body.style.cursor = HANDLES[handleClass || "drag-el"].cursor;
      document.addEventListener("pointermove", this.handleMove);
      document.addEventListener("pointerup", this.handleUp);
      document.addEventListener("pointercancel", this.handleUp);
      this.$el.addEventListener("lostpointercapture", this.handleUp);
      window.addEventListener("blur", this.handleUp);
      if (this.$el.setPointerCapture)
        this.$el.setPointerCapture(event.pointerId);
      this.emitEvent(dragging ? "drag:start" : "resize:start");
    },
    async handleMove(event) {
      const interaction = this.interaction;
      if (!interaction || event.pointerId !== interaction.pointerId) return;
      interaction.pointer = { x: event.clientX, y: event.clientY };
      if (interaction.restoring) return;
      const parentSize = {
        width: interaction.parentWidth,
        height: interaction.parentHeight,
      };
      if (interaction.dragging && this.prevState) {
        interaction.restoring = true;
        this.restoreSize();
        this.emitEvent("maximize", { state: false });
        await this.$nextTick();
        if (this.interaction !== interaction) return;
        const parentRect = this.$el.parentElement.getBoundingClientRect();
        const restored = this.measureRectangle();
        interaction.boxSize = this.measureBoxSize();
        interaction.rectangle = calculateRestoreRectangle({
          size: { width: restored.w, height: restored.h },
          pointer: {
            x: (interaction.pointer.x - parentRect.left) / interaction.scaleX,
            y: (interaction.pointer.y - parentRect.top) / interaction.scaleY,
          },
          parentSize,
          boxSize: interaction.boxSize,
        });
        this.l = interaction.rectangle.l;
        this.t = interaction.rectangle.t;
        interaction.restoring = false;
      }
      const rectangle = calculateRectangle({
        start: interaction.rectangle,
        delta: {
          x: (interaction.pointer.x - interaction.x) / interaction.scaleX,
          y: (interaction.pointer.y - interaction.y) / interaction.scaleY,
        },
        direction: interaction.direction,
        dragging: interaction.dragging,
        limits: this.limits,
        parentSize,
        fitParent: this.fitParent,
        disabledAttributes: this.disableAttributes,
        lockAspectRatio: interaction.lockAspectRatio,
        step: interaction.step,
        boxSize: interaction.boxSize,
      });
      if (this.calcMap & CALC_MASK.l) this.l = rectangle.l;
      if (this.calcMap & CALC_MASK.t) this.t = rectangle.t;
      if (!interaction.dragging) {
        if (this.calcMap & CALC_MASK.w) this.w = rectangle.w;
        if (this.calcMap & CALC_MASK.h) this.h = rectangle.h;
      }
      this.emitEvent(interaction.dragging ? "drag:move" : "resize:move");
    },
    handleUp(event) {
      if (
        this.interaction &&
        (event.type === "blur" ||
          event.pointerId === this.interaction.pointerId)
      ) {
        this.finishInteraction(true);
      }
    },
    finishInteraction(emitEnd, deferEnd = false) {
      const interaction = this.interaction;
      if (!interaction) return;
      this.interaction = null;
      document.removeEventListener("pointermove", this.handleMove);
      document.removeEventListener("pointerup", this.handleUp);
      document.removeEventListener("pointercancel", this.handleUp);
      this.$el.removeEventListener("lostpointercapture", this.handleUp);
      window.removeEventListener("blur", this.handleUp);
      if (
        this.$el.hasPointerCapture &&
        this.$el.hasPointerCapture(interaction.pointerId)
      ) {
        this.$el.releasePointerCapture(interaction.pointerId);
      }
      document.body.style.cursor = interaction.cursor;
      if (emitEnd) {
        const emit = () =>
          this.emitEvent(interaction.dragging ? "drag:end" : "resize:end");
        if (deferEnd) {
          // Let the entire prop batch and its CSS-size conversions settle first.
          Promise.resolve().then(() => {
            this.$nextTick(() => {
              if (!this.$.isUnmounted) emit();
            });
          });
        } else emit();
      }
    },
  },
};
</script>

<style scoped>
.resizable-component {
  position: relative;
}

.resizable-component > .resizable-handle {
  display: block;
  position: absolute;
  z-index: 90;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.resizable-component[data-resizable-drag],
.resizable-component :deep([data-resizable-drag]) {
  touch-action: none;
}

.resizable-r,
.resizable-l {
  width: 12px;
  height: 100%;
  top: 0;
}
.resizable-b,
.resizable-t {
  height: 12px;
  width: 100%;
  left: 0;
}
.resizable-component > .resizable-rb,
.resizable-component > .resizable-lb,
.resizable-component > .resizable-lt,
.resizable-component > .resizable-rt {
  width: 12px;
  height: 12px;
  z-index: 91;
}
.resizable-r,
.resizable-rb,
.resizable-rt {
  right: -6px;
}
.resizable-l,
.resizable-lb,
.resizable-lt {
  left: -6px;
}
.resizable-b,
.resizable-rb,
.resizable-lb {
  bottom: -6px;
}
.resizable-t,
.resizable-lt,
.resizable-rt {
  top: -6px;
}
.resizable-r {
  cursor: e-resize;
}
.resizable-rb {
  cursor: se-resize;
}
.resizable-b {
  cursor: s-resize;
}
.resizable-lb {
  cursor: sw-resize;
}
.resizable-l {
  cursor: w-resize;
}
.resizable-lt {
  cursor: nw-resize;
}
.resizable-t {
  cursor: n-resize;
}
.resizable-rt {
  cursor: ne-resize;
}
</style>
