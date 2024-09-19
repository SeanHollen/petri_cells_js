const addCanvasControlls = (store) => {
  const renderer = store.uiItems.renderer;
  let isDragging = false;
  let prevMouse = null;

  renderer.domElement.addEventListener(
    "mousedown",
    (event) => {
      controller.onMouseDown(event, store.state.grid, store.uiItems);
    },
    false
  );

  window.addEventListener("mousedown", (event) => {
    isDragging = true;
    prevMouse = {
      x: event.clientX,
      y: event.clientY,
    };
  });

  window.addEventListener("mouseup", (event) => {
    isDragging = false;
  });

  window.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    controller.drag(event, store.uiItems, prevMouse);
    prevMouse = {
      x: event.clientX,
      y: event.clientY,
    };
  });

  // right-click
  window.addEventListener("contextmenu", (event) => {
    isDragging = false;
  });

  // losing focus
  window.addEventListener("blur", () => {
    isDragging = false;
  });

  renderer.domElement.addEventListener("wheel", (event) => {
    controller.zoom(event, store.uiItems);
  });
};

export default addCanvasControlls;