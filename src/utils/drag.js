const INTERACTIVE_SELECTOR = "input, textarea, select, option, button, a[href]";

export function shouldCancelDrag(target, cancelSelector) {
  if (target.closest(INTERACTIVE_SELECTOR)) return true;
  if (cancelSelector && target.closest(cancelSelector)) return true;
  if (typeof target.isContentEditable === "boolean")
    return target.isContentEditable;

  // DOM implementations without isContentEditable still expose the attributes.
  let editable = target.closest("[contenteditable]");
  while (editable) {
    const value = editable.getAttribute("contenteditable").toLowerCase();
    if (value === "false") return false;
    if (["", "true", "plaintext-only"].includes(value)) return true;
    editable = editable.parentElement?.closest("[contenteditable]");
  }
  return false;
}
