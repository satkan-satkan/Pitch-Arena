// Every overlay owns a token. Closing overlays in any order must not strand
// the page in overflow:hidden or unlock it while another overlay is open.
const locks = new Set();
let previous;
export function lockBodyScroll(body = document.body) {
  const token = {};
  if (!locks.size) {
    previous = {
      body,
      value: body.style.getPropertyValue("overflow"),
      priority: body.style.getPropertyPriority("overflow"),
    };
    body.style.setProperty("overflow", "hidden");
  }
  locks.add(token);
  return () => {
    if (!locks.delete(token) || locks.size) return;
    if (previous.value)
      previous.body.style.setProperty(
        "overflow",
        previous.value,
        previous.priority,
      );
    else previous.body.style.removeProperty("overflow");
    previous = undefined;
  };
}
