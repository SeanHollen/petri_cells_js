import { EventHandleHelper } from "../shared/handleEvents.js";
import { GridController } from "./gridController.js";
import { HistoryManager } from "./historyManager.js";
import miscSettings from "../miscSettings.js";

const controller = new GridController();
const initSpec = controller.getInitSpec();
const store = {
  state: controller.initState(initSpec),
  uiItems: controller.initGridUI(),
};
const history = new HistoryManager().init(
  miscSettings.historyFidelity,
  store.state
);
controller.updateGridUI(store);

const buttonMapping = {
  backButton: "board-back-button",
  stepButton: "board-step-button",
  runButton: "board-run-button",
  restartButton: "board-restart-button",
};

const backAction = () => {
  const runSpec = controller.getRunSpec();
  store.state = controller.backState(history, store.state);
  controller.updateGridUI(store, runSpec.toRecolor);
};
const stepAction = () => {
  const runSpec = controller.getRunSpec();
  store.state = controller.updateState(store.state, runSpec);
  history.addState(store.state);
  controller.updateGridUI(store, runSpec.toRecolor);
};

const eventHandleHelper = new EventHandleHelper(
  buttonMapping,
  stepAction,
  backAction
);

eventHandleHelper.addEventListener(buttonMapping.backButton, backAction);
eventHandleHelper.addEventListener(buttonMapping.stepButton, stepAction);
const runButton = document.getElementById(buttonMapping.runButton);
eventHandleHelper.addEventListener(buttonMapping.runButton, () => {
  const runSpec = controller.getRunSpec();
  controller.toggleRun(runButton, store, history, runSpec);
});
eventHandleHelper.addEventListener(buttonMapping.restartButton, () => {
  controller.clear(store.uiItems);
  const initSpec = controller.getInitSpec();
  store.state = controller.initState(initSpec);
  history.init(miscSettings.historyFidelity, store.state);
  controller.updateGridUI(store, true);
  controller.stopRunning(store, runButton);
});

eventHandleHelper.addEventListener("cell-details-edit-button", () => {
  controller.enterCellEditMode();
});
eventHandleHelper.addEventListener("cancel-button", () => {
  controller.exitCellEditMode();
});
document
  .getElementById("cell-details-1-edit-input")
  .addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputVal = document.getElementById(
        "cell-details-1-edit-input"
      ).value;
      controller.editProgramWithNumsForm(store.state, inputVal, store.uiItems);
    }
  });
document
  .getElementById("cell-details-2-edit-input")
  .addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputVal = document.getElementById(
        "cell-details-2-edit-input"
      ).value;
      controller.editProgramWithColorsForm(
        store.state,
        inputVal,
        store.uiItems
      );
    }
  });
eventHandleHelper.addEventListener("cell-details-1-edit-submit", () => {
  const inputVal = document.getElementById("cell-details-1-edit-input").value;
  controller.editProgramWithNumsForm(store.state, inputVal, store.uiItems);
});
eventHandleHelper.addEventListener("cell-details-2-edit-submit", () => {
  const inputVal = document.getElementById("cell-details-2-edit-input").value;
  controller.editProgramWithColorsForm(store.state, inputVal, store.uiItems);
});

/* zooming, panning, clicking */

let { renderer, camera } = store.uiItems;

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
  controller.zoom(event, store.uiItems)
});

/* adding to window */

window.store = store;
window.HistoryManager = HistoryManager;
window.hist = history;
window.GridController = GridController;
window.controller = controller;
