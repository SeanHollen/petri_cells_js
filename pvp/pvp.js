import { EventHandleHelper } from "../shared/handleEvents.js";
import { GridController } from "../board/gridController.js"
import { HistoryManager } from "../board/historyManager.js";

const HISTORY_FIDELITY = 20;
const inputtedWidth = document.getElementById("bf-w")[0].value;
const width = parseFloat(inputtedWidth);
const inputtedHeight = document.getElementById("bf-h")[0].value;
const height = parseFloat(inputtedHeight);
const controller = new GridController();
const store = {
  state: controller.initStateToData(width, height),
  uiItems: controller.initGridUI(width, height),
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
  const runSpec = controller.getRunSpec();
  store.state = controller.backState(history, store.state, runSpec);
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
  const inputtedWidth = document.getElementById("bf-w")[0].value;
  const width = parseFloat(inputtedWidth) || 10;
  const inputtedHeight = document.getElementById("bf-h")[0].value;
  const height = parseFloat(inputtedHeight) || 10;

  // Get user input for two programs
  const program1Input = prompt("Enter the first program:");
  const program2Input = prompt("Enter the second program:");

  const program1 = controller.logic.fromGenericInput(program1Input);
  const program2 = controller.logic.fromGenericInput(program2Input);

  store.uiItems = controller.initGridUI(width, height);
  store.state = controller.initStateToData(width, height);
  store.state.grid = controller.placeProgramsRandomly(
    store.state.grid,
    [program1, program2],
  );
  history.init(HISTORY_FIDELITY, store.state);
  controller.updateGridUI(store);
  controller.stopRunning(runButton);
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
  const inputVal = document.getElementById("cell-details-1-edit-input").value;
  controller.editProgramWithNumsForm(store.state, inputVal);
});
eventHandleHelper.addEventListener("cell-details-2-edit-submit", () => {
  const inputVal = document.getElementById("cell-details-2-edit-input").value;
  controller.editProgramWithColorsForm(store.state, inputVal);
});

window.store = store;
window.HistoryManager = HistoryManager;
window.GridController = GridController;
