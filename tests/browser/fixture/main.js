import Vue from "vue";
import VueResizable from "vue-resizable";

const { nextTick } = Vue;
const props = Vue.observable({
  width: "75%",
  height: 250,
  minWidth: 320,
  fitParent: true,
  dragSelector: ".content",
  dragCancelSelector: ".custom-editor",
  maximize: false,
});
const state = Vue.observable({
  boxStyle: {},
  contentStyle: { height: "100%", background: "#eee" },
  lateHandle: false,
  parentWidth: 800,
});
function updateProps(value) {
  Object.entries(value).forEach(([key, value]) => Vue.set(props, key, value));
}
const events = [];
let echoEnd = false;
let lastEnd = null;
function handleEnd(event) {
  const { width, height, left, top } = event;
  lastEnd = { width, height, left, top };
  events.push(event.eventName);
  if (echoEnd) updateProps(lastEnd);
}

const app = new Vue({
  data: () => ({ props }),
  render(h) {
    return h(
      "div",
      {
        attrs: { id: "parent" },
        style: {
          width: `${state.parentWidth}px`,
          height: "400px",
          position: "relative",
          margin: "60px",
        },
      },
      [
        h(
          VueResizable,
          {
            ref: "resizable",
            props: this.props,
            style: state.boxStyle,
            on: {
              maximize: (event) => {
                props.maximize = event.state;
              },
              "drag:start": () => events.push("drag:start"),
              "drag:end": handleEnd,
              "resize:start": () => events.push("resize:start"),
              "resize:end": handleEnd,
            },
          },
          [
            h(
              "div",
              {
                class: "content",
                style: state.contentStyle,
              },
              [
                h(
                  "div",
                  { attrs: { id: "handle" }, style: { height: "30px" } },
                  "Drag here"
                ),
                state.lateHandle
                  ? h(
                      "div",
                      {
                        attrs: { id: "late" },
                        class: "late-handle",
                        style: { height: "30px" },
                      },
                      "Late header"
                    )
                  : null,
                h("textarea", { attrs: { id: "text" } }),
                h(
                  "div",
                  { attrs: { id: "editable", contenteditable: "true" } },
                  "Editable text"
                ),
                h("div", { class: "custom-editor" }, [
                  h("span", { attrs: { id: "custom" } }, "Custom editor"),
                ]),
              ]
            ),
          ]
        ),
      ]
    );
  },
}).$mount("#app");

window.fixture = {
  importedExport: {
    keys: Object.keys(VueResizable),
    name: VueResizable.name,
    defaultName: VueResizable.default?.name,
  },
  events,
  setEndFeedback(enabled) {
    echoEnd = enabled;
  },
  endState() {
    return lastEnd;
  },
  async setWidth(value) {
    props.width = value;
    await nextTick();
    await nextTick();
  },
  async setParentWidth(value) {
    state.parentWidth = value;
    await nextTick();
  },
  async setProps(value) {
    updateProps(value);
    await nextTick();
    await nextTick();
  },
  async setBoxStyle(value) {
    state.boxStyle = value;
    await nextTick();
  },
  async setContentStyle(value) {
    state.contentStyle = value;
    await nextTick();
  },
  async setLateHandle(value) {
    state.lateHandle = value;
    await nextTick();
  },
  state() {
    return {
      width: app.$refs.resizable.w,
      left: app.$refs.resizable.l,
      top: app.$refs.resizable.t,
    };
  },
};
