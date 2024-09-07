import { EventHandleHelper } from "../shared/handleEvents.js";
import { GridController } from "./gridController.js"
import { HistoryManager } from "./historyManager.js";

const HISTORY_FIDELITY = 50;
const controller = new GridController();
const initSpec = controller.getInitSpec();
const store = {
  state: controller.initState(initSpec),
  uiItems: controller.initGridUI(initSpec.width, initSpec.height),
};
const history = new HistoryManager().init(HISTORY_FIDELITY, store.state);
controller.updateGridUI(store);

const buttonMapping = {
  backButton: "board-back-button",
  stepButton: "board-step-button",
  runButton: "board-run-button",
  restartButton: "board-restart-button",
};

const backAction = () => {
  store.state = controller.backState(history, store.state);
  controller.updateGridUI(store);
};
const stepAction = () => {
  const runSpec = controller.getRunSpec();
  store.state = controller.updateState(store.state, runSpec);
  history.addState(store.state);
  controller.updateGridUI(store);
};

const eventHandleHelper = new EventHandleHelper(buttonMapping, stepAction, backAction)

eventHandleHelper.addEventListener(buttonMapping.backButton, backAction);
eventHandleHelper.addEventListener(buttonMapping.stepButton, stepAction);
const runButton = document.getElementById(buttonMapping.runButton);
eventHandleHelper.addEventListener(buttonMapping.runButton, () => {
  const runSpec = controller.getRunSpec();
  controller.toggleRun(runButton, store, history, runSpec);
});
eventHandleHelper.addEventListener(buttonMapping.restartButton, () => {
  const initSpec = controller.getInitSpec();
  store.uiItems = controller.initGridUI(initSpec.width, initSpec.height);
  store.state = controller.initState(initSpec);
  history.init(HISTORY_FIDELITY, store.state);
  controller.updateGridUI(store);
  controller.stopRunning(store.state, runButton);
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
      const inputVal = document.getElementById("cell-details-1-edit-input").value
      controller.editProgramWithNumsForm(store.state, inputVal);
    }
  });
document
  .getElementById("cell-details-2-edit-input")
  .addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputVal = document.getElementById("cell-details-2-edit-input").value;
      controller.editProgramWithColorsForm(store.state, inputVal);
    }
  });
eventHandleHelper.addEventListener("cell-details-1-edit-submit", () => {
  const inputVal = document.getElementById("cell-details-1-edit-input").value
  controller.editProgramWithNumsForm(store.state, inputVal);
});
eventHandleHelper.addEventListener("cell-details-2-edit-submit", () => {
  const inputVal = document.getElementById("cell-details-2-edit-input").value;
  controller.editProgramWithColorsForm(store.state, inputVal);
});

window.store = store;
window.hist = history;
window.HistoryManager = HistoryManager;
window.GridController = GridController;
