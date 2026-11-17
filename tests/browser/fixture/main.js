import { createApp, h, nextTick, reactive, ref } from "vue";
import VueResizable from "vue-resizable";

const props = reactive({
  width: "75%",
  height: 250,
  minWidth: 320,
  fitParent: true,
  dragSelector: ".content",
  dragCancelSelector: ".custom-editor",
  maximize: false,
});
const boxStyle = ref({});
const contentStyle = ref({ height: "100%", background: "#eee" });
const lateHandle = ref(false);
const parentWidth = ref(800);
const component = ref();
const events = [];
let echoEnd = false;
let lastEnd = null;
function handleEnd(event) {
  const { width, height, left, top } = event;
  lastEnd = { width, height, left, top };
  events.push(event.eventName);
  if (echoEnd) Object.assign(props, lastEnd);
}

createApp({
  render() {
    return h(
      "div",
      {
        id: "parent",
        style: {
          width: `${parentWidth.value}px`,
          height: "400px",
          position: "relative",
          margin: "60px",
        },
      },
      [
        h(
          VueResizable,
          {
            ref: component,
            ...props,
            style: boxStyle.value,
            onMaximize: (event) => {
              props.maximize = event.state;
            },
            "onDrag:start": () => events.push("drag:start"),
            "onDrag:end": handleEnd,
            "onResize:start": () => events.push("resize:start"),
            "onResize:end": handleEnd,
          },
          {
            default: () =>
              h(
                "div",
                {
                  class: "content",
                  style: contentStyle.value,
                },
                [
                  h(
                    "div",
                    { id: "handle", style: { height: "30px" } },
                    "Drag here"
                  ),
                  lateHandle.value
                    ? h(
                        "div",
                        {
                          id: "late",
                          class: "late-handle",
                          style: { height: "30px" },
                        },
                        "Late header"
                      )
                    : null,
                  h("textarea", { id: "text" }),
                  h(
                    "div",
                    { id: "editable", contenteditable: "true" },
                    "Editable text"
                  ),
                  h("div", { class: "custom-editor" }, [
                    h("span", { id: "custom" }, "Custom editor"),
                  ]),
                ]
              ),
          }
        ),
      ]
    );
  },
}).mount("#app");

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
    parentWidth.value = value;
    await nextTick();
  },
  async setProps(value) {
    Object.assign(props, value);
    await nextTick();
    await nextTick();
  },
  async setBoxStyle(value) {
    boxStyle.value = value;
    await nextTick();
  },
  async setContentStyle(value) {
    contentStyle.value = value;
    await nextTick();
  },
  async setLateHandle(value) {
    lateHandle.value = value;
    await nextTick();
  },
  state() {
    return {
      width: component.value.w,
      left: component.value.l,
      top: component.value.t,
    };
  },
};
