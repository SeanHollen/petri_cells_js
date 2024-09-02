import {
  randomProgram,
  toHumanReadableStr,
  fromHumanReadableStr,
  execute1Read,
} from "./brainfuckLogic.js";

class BrainfuckExecutor {
  constructor() {
    this.running = false;
  }

  initState(startingTape) {
    this.history = [];
    if (startingTape !== null) {
      this.program1 = startingTape;
    } else {
      this.program1 = randomProgram();
    }
    this.tapeLength = this.program1.length;
    this.state = {
      tape: this.program1,
      pointer: 0,
      head0: 0,
      head1: 0,
      loopStack: [],
      numReads: 0,
      maxReads: 2 ** 13,
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

  updateState() {
    if (this.runningBackwards) {
      this.backState();
      return;
    }
    this.history.push(this.state);
    this.state = execute1Read(this.state);
    this.runningBackwards = false;
  }

  backState() {
    if (this.history.length > 0) {
      this.state = this.history.pop();
    }
  }

  updateContent() {
    this.program1 = this.state.tape;
    this.tapeLabel.innerText = toHumanReadableStr(this.program1);
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

  toggleRun(button) {
    if (this.running) {
      this.running = false;
      button.textContent = "Run";
      clearInterval(this.runInterval);
    } else {
      const speedForm = document.getElementById("bf-speed")[0];
      let speed = parseFloat(speedForm.value);
      if (speed < 0) {
        this.runningBackwards = true;
        speed *= -1;
      }

      this.running = true;
      button.textContent = "Pause";
      this.runInterval = setInterval(() => {
        this.updateState();
        this.updateContent();
      }, 1000 / speed);
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
      state = randomProgram();
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

  acceptInput(text) {
    const isIntegerFormat = /^[,\-\d]+$/.test(text);
    if (isIntegerFormat) {
      const intArr = text.split(",").map((num) => parseInt(num));
      const validValues = intArr.every(
        (i) => !isNaN(i) && i !== null && i !== undefined
      );
      if (validValues) {
        return intArr;
      }
    }
    const textNoWhitespace = text.replace(/\s+/g, "");
    const isHrBfFormat = /^[a-zA-Z0-9{}\-\+\<\>\.,\[\]%&]+$/.test(
      textNoWhitespace
    );
    if (isHrBfFormat) {
      return fromHumanReadableStr(text);
    }
    throw new Error(`${text} contains invalid characters`);
  }

  editTapeCloseForm() {
    const text = this.tapeInput.value;
    let intArr;
    try {
      intArr = this.acceptInput(text);
    } catch {
      this.tapeInput.classList.add("error");
      return;
    }
    this.tapeInput.classList.remove("error");
    const filteredText = toHumanReadableStr(intArr);
    this.tapeLabel.style.display = "inline";
    this.tapeForm.style.display = "none";
    this.tapeHead.style.height = "19px";
    this.tapeLabel.innerText = filteredText;
    this.initState(intArr);
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

function addEventListener(id, action, preventDefaults) {
  // I want to use mousedown rather than click, because it's more snappy
  // but mousedown doesn't cover spacebar and enter-key presses
  // and if I register them both, then it causes both to trigger
  // so I check e.screenX to register whether it was an actual click,
  // and differentiate between mouse clicks and button clicks that way.
  document.getElementById(id).addEventListener("mousedown", (e) => {
    if (preventDefaults) {
      e.preventDefault();
    }
    if (e.screenX) {
      action();
    }
  });
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      document.getElementById("bf-step-button").focus()
      stepAction();
    } else if (e.key === "ArrowLeft") {
      document.getElementById("bf-back-button").focus()
      backAction();
    } else {
      if (preventDefaults) {
        e.preventDefault();
      }
      if (!e.screenX) {
        action();
      }
    }
  });
}

const backAction = () => {
  controller.backState();
  controller.updateContent();
};
addEventListener("bf-back-button", backAction);
const stepAction = () => {
  controller.updateState();
  controller.updateContent();
};
addEventListener("bf-step-button", stepAction);
addEventListener("bf-run-button", () => {
  const runButton = document.getElementById("bf-run-button");
  controller.toggleRun(runButton);
});
addEventListener("bf-restart-button", () => {
  controller.startup();
});
addEventListener("bf-edit-button", () => {
  controller.openEditTapeForm();
}, true);
addEventListener("edit-tape-form", () => {
  controller.editTapeCloseForm();
}, true);
document.getElementById("tape-form").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    controller.editTapeCloseForm();
  }
});
