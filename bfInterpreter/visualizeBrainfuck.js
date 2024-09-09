import { BrainfuckLogic } from "../shared/brainfuckLogic.js";
import { EventHandleHelper } from "../shared/handleEvents.js";
import { getLanguageMapping } from "../shared/readLanguageMapping.js";

class BrainfuckExecutor {
  constructor() {
    this.running = false;
    this.logic = new BrainfuckLogic(getLanguageMapping());
  }

  initState(startingTape) {
    this.history = [];
    if (startingTape !== null) {
      this.program1 = startingTape;
    } else {
      this.program1 = BrainfuckLogic.randomProgram();
    }
    this.tapeLength = this.program1.length;
    this.state = {
      tape: this.program1,
      pointer: 0,
      head0: 0,
      head1: 0,
      loopStack: [],
      numReads: 0,
    };
    clearInterval(this.runInterval);
    this.runInterval = null;
  }

  initContent() {
    this.numReadsLabel = document.getElementById("num-reads-vis");
    this.paransLabel = document.getElementById("loop-stack-vis");
    this.pointerLabel = document.getElementById("pointer-vis");
    this.tapeLabel = document.getElementById("tape-vis");
    this.tapeForm = document.getElementById("tape-form");
    this.tapeInput = document.getElementById("tape-input");
    this.hLabel = document.getElementById("h0-h1-vis");
    this.tapeHead = document.getElementById("tape-label");
  }

  updateState(runSpec) {
    if (this.runningBackwards) {
      this.backState();
      return;
    }
    this.logic = runSpec.bfLogic;
    this.history.push(this.state);
    this.state = this.logic.execute1Read(this.state);
    this.runningBackwards = false;
  }

  backState() {
    if (this.history.length > 0) {
      this.state = this.history.pop();
    }
  }

  updateContent() {
    this.program1 = this.state.tape;
    this.tapeLabel.innerText = this.logic.toHumanReadableStr(this.program1);
    let pointer = this.state.pointer;
    if (pointer >= this.program1.length) {
      this.running = false;
      clearInterval(this.runInterval);
    }
    let numReads = this.state.numReads;
    this.numReadsLabel.innerText = numReads;
    let h0 = this.state.head0;
    let h1 = this.state.head1;
    this.pointerLabel.innerText =
      "" + " ".repeat(pointer) + "v" + " ".repeat(this.tapeLength - pointer);

    const addressConvert = (i) => {
      if (i === h0 && i === h1) {
        return "^";
      } else if (i === h0) {
        return "0";
      } else if (i === h1) {
        return "1";
      } else {
        return " ";
      }
    };
    this.hLabel.innerText = Array.from({ length: this.tapeLength }, (_, i) =>
      addressConvert(i)
    ).join("");
    let loopStack = this.state.loopStack;
    this.paransLabel.innerText = Array.from(
      { length: this.tapeLength },
      (_, i) => (loopStack.includes(i) ? "[" : " ")
    ).join("");
  }

  toggleRun(button, runSpec) {
    if (this.running) {
      this.running = false;
      button.textContent = "Run";
      clearInterval(this.runInterval);
    } else {
      if (runSpec.speed < 0) {
        this.runningBackwards = true;
        runSpec.speed *= -1;
      }

      this.running = true;
      button.textContent = "Pause";
      this.runInterval = setInterval(() => {
        this.updateState(runSpec);
        this.updateContent();
      }, 1000 / runSpec.speed);
    }
  }

  startup(state) {
    if (this.running) {
      this.running = false;
      const runButton = document.getElementById("bf-run-button");
      runButton.textContent = "Run";
      clearInterval(this.runInterval);
    }
    if (!state) {
      state = BrainfuckLogic.randomProgram();
    }
    this.initState(state);
    this.updateContent();
  }

  openEditTapeForm() {
    const text = this.tapeLabel.innerText;
    this.tapeLabel.style.display = "none";
    this.tapeForm.style.display = "inline-flex";
    this.tapeHead.style.height = "25px"
    this.tapeInput.value = text;
    // select the input and highligh text
    this.tapeInput.select();
  }

  editTapeCloseForm() {
    const text = this.tapeInput.value;
    let intArr;
    try {
      intArr = this.logic.fromGenericInput(text);
    } catch {
      this.tapeInput.classList.add("error");
      return;
    }
    this.tapeInput.classList.remove("error");
    const filteredText = this.logic.toHumanReadableStr(intArr);
    this.tapeLabel.style.display = "inline";
    this.tapeForm.style.display = "none";
    this.tapeHead.style.height = "";
    this.tapeHead.style.display = "block";
    this.tapeLabel.innerText = filteredText;
    this.initState(intArr);
  }

  getRunSpec() {
    const speedForm = document.getElementById("bf-speed")[0];
    let speed = parseFloat(speedForm.value);
    const languageMapping = getLanguageMapping();
    const bfLogic = new BrainfuckLogic(languageMapping);
    return {speed, bfLogic}
  }
}

// a miscellaneous interesting state
const initialState = [
  4, 9, 5, 1, 0, 3, 3, 1, 8, 1, 2, 8, 1, 6, 0, 4, 8, 4, 6, 9, 7, 6, 6, 8, 2, 10,
  7, 10, 6, 6, 4, 10, 6, 3, 6, 9, 9, 10, 8, 3, 2, 6, 7, 6, 8, 8, 4, 1, 8, 6, 4,
  0, 3, 3, 2, 4, 4, 0, 0, 6, 7, 7, 10, 7,
];

const controller = new BrainfuckExecutor();
controller.initContent();
controller.startup(initialState);

const buttonMapping = {
  backButton: "bf-back-button",
  stepButton: "bf-step-button",
  runButton: "bf-run-button",
  restartButton: "bf-restart-button",
};

const backAction = () => {
  controller.backState();
  controller.updateContent();
};
const stepAction = () => {
  const runSpec = controller.getRunSpec();
  controller.updateState(runSpec);
  controller.updateContent();
};

const eventHandleHelper = new EventHandleHelper(buttonMapping, stepAction, backAction)

eventHandleHelper.addEventListener(buttonMapping.backButton, backAction);
eventHandleHelper.addEventListener(buttonMapping.stepButton, stepAction);
eventHandleHelper.addEventListener(buttonMapping.runButton, () => {
  const runButton = document.getElementById(buttonMapping.runButton);
  const runSpec = controller.getRunSpec();
  controller.toggleRun(runButton, runSpec);
});
eventHandleHelper.addEventListener(buttonMapping.restartButton, () => {
  controller.startup();
});
eventHandleHelper.addEventListener("bf-edit-button", () => {
  controller.openEditTapeForm();
}, true);
eventHandleHelper.addEventListener("edit-tape-form", () => {
  controller.editTapeCloseForm();
}, true);
document.getElementById("tape-form").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    controller.editTapeCloseForm();
  }
});
