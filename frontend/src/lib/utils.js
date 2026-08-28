export function scrollToId(id) {
  document.querySelector(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
