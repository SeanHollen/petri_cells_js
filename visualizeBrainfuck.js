import { randomProgram, toHumanReadableStr, fromHumanReadableStr } from "./brainfuckLogic.js";

class BrainfuckExecutor {
  initState(startingTape) {
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
    this.running = false;
    this.runInterval = null;
  }

  initContent(layout) {
    this.numReadsLabel = document.getElementById("num-reads-vis")
    this.paransLabel = document.getElementById("loop-stack-vis")
    this.pointerLabel = document.getElementById("pointer-vis")
    this.tapeLabel = document.getElementById("tape-vis")
    this.tapeForm = document.getElementById("tape-form")
    this.tapeInput = document.getElementById("tape-input")
    this.hLabel = document.getElementById("h0-h1-vis")
  }

  updateState() {
    this.state = this.updateStateHelper(this.state);
    this.updateContent();
  }

  updateStateHelper({
    tape,
    pointer,
    head0,
    head1,
    loopStack,
    numReads,
    maxReads,
  }) {
    numReads += 1;
    let char = tape[pointer];
    switch (char) {
      case 1:
        head0 = (head0 - 1 + tape.length) % tape.length;
        break;
      case 2:
        head0 = (head0 + 1) % tape.length;
        break;
      case 3:
        head1 = (head1 - 1 + tape.length) % tape.length;
        break;
      case 4:
        head1 = (head1 + 1) % tape.length;
        break;
      case 5:
        tape[head0] -= 1;
        break;
      case 6:
        tape[head0] += 1;
        break;
      case 7:
        tape[head1] = tape[head0];
        break;
      case 8:
        tape[head0] = tape[head1];
        break;
      case 9:
        if (tape[head0] === 0) {
          let loopLevel = 1;
          while (
            loopLevel > 0 &&
            pointer < tape.length - 1 &&
            numReads < maxReads
          ) {
            numReads += 1;
            pointer += 1;
            if (tape[pointer] === 9) {
              loopLevel += 1;
            } else if (tape[pointer] === 10) {
              loopLevel -= 1;
            }
          }
        } else {
          loopStack.push(pointer);
        }
        break;
      case 10:
        if (tape[head0] !== 0) {
          if (loopStack.length === 0) {
            pointer = -1;
          } else {
            pointer = loopStack[loopStack.length - 1];
          }
        } else {
          if (loopStack.length > 0) {
            loopStack.pop();
          }
        }
        break;
    }
    pointer = (pointer + 1) % tape.length;
    return { tape, pointer, head0, head1, loopStack, numReads, maxReads };
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
      "" +
      " ".repeat(pointer) +
      "v" +
      " ".repeat(this.tapeLength - pointer - 1);

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
    this.hLabel.innerText = Array.from({ length: this.tapeLength }, (_, i) => addressConvert(i)).join(
        ""
      );
    let loopStack = this.state.loopStack;
    this.paransLabel.innerText = Array.from({ length: this.tapeLength }, (_, i) =>
        loopStack.includes(i) ? "[" : " "
      ).join("");
  }

  toggleRun(button) {
    if (this.running) {
      this.running = false;
      button.textContent = "Run";
      clearInterval(this.runInterval);
    } else {
      const speedForm = document.getElementById("bfSpeed")[0];
      const speed = parseFloat(speedForm.value);

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
      const runButton = document.getElementById("bfRunButton");
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
    const text = this.tapeLabel.innerText
    this.tapeLabel.style.display = "none"
    this.tapeForm.style.display = "inline-flex"
    this.tapeInput.value = text;
  }

  editTapeCloseForm() {
    const text = this.tapeInput.value
    const intArr = fromHumanReadableStr(text)
    const filteredText = toHumanReadableStr(intArr)
    this.tapeLabel.style.display = "inline"
    this.tapeForm.style.display = "none"
    this.tapeLabel.innerText = filteredText
    this.initState(intArr)
  }
}

const contentController = new BrainfuckExecutor();
const initialState = [
  4, 9, 5, 1, 0, 3, 3, 1, 8, 1, 2, 8, 1, 6, 0, 4, 8, 4, 6, 9, 7, 6, 6, 8, 2, 10,
  7, 10, 6, 6, 4, 10, 6, 3, 6, 9, 9, 10, 8, 3, 2, 6, 7, 6, 8, 8, 4, 1, 8, 6, 4,
  0, 3, 3, 2, 4, 4, 0, 0, 6, 7, 7, 10, 7,
];
contentController.initContent(document.getElementById("bfActionDiv"));
contentController.startup(initialState);
document.getElementById("bfStepButton").addEventListener("click", () => {
  contentController.updateState();
  contentController.updateContent();
});
const runButton = document.getElementById("bfRunButton");
runButton.addEventListener("click", () => {
  contentController.toggleRun(runButton);
});
document.getElementById("bfRestartButton").addEventListener("click", () => {
  contentController.startup();
});
document.getElementById("bfEditButton").addEventListener("click", () => {
  contentController.openEditTapeForm();
});
document.getElementById("editTapeForm").addEventListener("click", () => {
  event.preventDefault(); // prevents page from refreshing
  contentController.editTapeCloseForm();
});