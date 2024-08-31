import {
  crossReactPrograms,
  randomProgram,
  toHumanReadableStr,
  fromHumanReadableStr,
} from "./brainfuckLogic.js";
window.crossReactPrograms = crossReactPrograms;
window.randomProgram = randomProgram;
window.toHumanReadableStr = toHumanReadableStr;
window.fromHumanReadableStr = fromHumanReadableStr;

class GridController {
  constructor() {
    this.copyIconEventListener = (e) => {
        navigator.clipboard.writeText(toHumanReadableStr(this.lastSelectedProgram));
        document.getElementById("copy-icon-validation").style.display = "inline-block";
    };
    this.colorMapping = {
      0: "#F0F2F3", // white
      1: "#E64C3C", // red
      2: "#F29B11", // orange
      3: "#F3CF3E", // yellow
      4: "#7A3E00", // brown
      5: "#145A32", // green
      6: "#A2D9CD", // light green
      7: "#1A5276", // blue
      8: "#A3E4D7", // cyan
      9: "#8E44AD", // purple
      10: "#AE7AC4", // pink
    };
  }

  intToColor(num) {
    if (num in this.colorMapping) {
      return this.colorMapping[num];
    } else if (num < 0) {
      const x = Math.max(0, 256 + num);
      return `rgb(${x},${x},${x})`;
    } else if (num > 10) {
      const x = Math.max(0, 1 - num);
      const r = Math.max(0, x - 10);
      return `rgb(${r},${x},${x})`;
    }
  }

  visualizeProgram(program, cellElement, x, y) {
    if (!cellElement) return;

    const canvas = document.createElement("canvas");
    const previousCanvas = cellElement.getElementsByTagName("canvas")[0];
    canvas.id = `${x}_${y}`;
    canvas.width = 32;
    canvas.height = 32;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");

    const updatesSet = {};
    for (let i = 0; i < 64; i++) {
      const x = (i % 8) * 4;
      const y = Math.floor(i / 8) * 4;
      const color = this.intToColor(program[i]);
      const updates = [x, y];
      if (!updatesSet[color]) {
        updatesSet[color] = [];
      }
      updatesSet[color].push(updates);
    }
    Object.keys(updatesSet).forEach((color) => {
      ctx.fillStyle = color;
      updatesSet[color].forEach((update) => {
        [x, y] = update;
        ctx.fillRect(x, y, 4, 4);
      });
    });

    const cellClickEventListener = (e) => {
      if (this.lastSelectedProgram) {
        this.lastSelectedCellElement.style.border = "none";
        document.getElementById("cell-details").style.display = "none";
        document.getElementById("copy-icon-validation").style.display = "none";
        if (program == this.lastSelectedProgram) {
            this.lastSelectedProgram = null;
            return;
        }
      }
      this.lastSelectedProgram = program;
      this.lastSelectedCellElement = cellElement;

      document.getElementById("cell-details").style.display = "inline-block";
      const cellDetails1 = document.getElementById("cell-details-1");
      const cellDetails2 = document.getElementById("cell-details-2");

      const asNumbers = program.join(",");
      cellDetails1.innerText = asNumbers;
      const asHrString = toHumanReadableStr(program);
      const asChars = asHrString.split("");
      const asColorsHtml = program
        .map((num, index) => {
          return `<div class="char-instruction" style="background-color:${this.intToColor(
            num
          )};">${asChars[index]}</div>`;
        })
        .join("");
      cellDetails2.innerHTML = asColorsHtml;
      cellElement.style.border = "3px solid black";
    };
    canvas.addEventListener("click", cellClickEventListener);

    document
      .getElementById("copy-icon")
      .addEventListener("click", this.copyIconEventListener);

    cellElement.innerHTML = "";
    cellElement.appendChild(canvas);
  }

  initGridState(width, height) {
    this.isRunning = false;
    this.stepCount = 0;
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => randomProgram())
    );
  }

  initGridUI(width, height) {
    const container = document.getElementById("life-board");
    container.innerHTML = "";

    const stepCounter = document.createElement("div");

    stepCounter.textContent = `Step: 0`;
    stepCounter.id = "stepCounter";
    stepCounter.style.fontSize = "18px";
    stepCounter.style.marginBottom = "10px";
    container.appendChild(stepCounter);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${width}, 3.5vmin)`;
    grid.style.gridTemplateRows = `repeat(${height}, 3.5vmin)`;
    grid.style.gap = ".4vmin";
    container.appendChild(grid);
    const cells = [];
    for (let i = 0; i < width * height; i++) {
      const cell = document.createElement("div");
      cell.style.backgroundColor = "#fff";
      cell.style.cursor = "pointer";
      grid.appendChild(cell);
      cells.push(cell);
    }
    return cells;
  }

  updateGridState(grid, range) {
    this.stepCount++;
    const height = grid.length;
    const width = grid[0].length;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const x2 = (i + Math.floor(Math.random() * (2 * range + 1)) - range + height) % height;
        const y2 = (j + Math.floor(Math.random() * (2 * range + 1)) - range + width) % width;
        const [newProgram1, newProgram2] = crossReactPrograms(
          grid[i][j],
          grid[x2][y2]
        );
        grid[i][j] = newProgram1;
        grid[x2][y2] = newProgram2;
      }
    }

    return grid;
  }

  updateGridUI(grid, cells) {
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        this.visualizeProgram(
          grid[i][j],
          cells[i * grid[i].length + j],
          j,
          grid.length - i - 1
        );
      }
    }
    document.getElementById(
      "stepCounter"
    ).textContent = `Step: ${this.stepCount}`;
  }

  stopRunning(button) {
    this.running = false;
    button.textContent = "Run";
    clearInterval(this.runInterval);
  }

  toggleRun(button, grid, cells) {
    if (this.running) {
      this.stopRunning(button);
      return;
    }
    const speedForm = document.getElementById("grid-speed")[0];
    const speed = parseFloat(speedForm.value);

    const rangeForm = document.getElementById("grid-range")[0];
    const range = parseFloat(rangeForm.value);

    this.running = true;
    button.textContent = "Pause";
    this.runInterval = setInterval(() => {
      grid = this.updateGridState(grid, range);
      let time = new Date();
      this.updateGridUI(grid, cells);
    //   console.log(`${new Date() - time} milliseconds to update ui`);
    }, 1000 / speed);
  }
}

const contentController = new GridController();
const inputtedWidth = document.getElementById("bf-w")[0].value;
const width = parseFloat(inputtedWidth);
const inputtedHeight = document.getElementById("bf-h")[0].value;
const height = parseFloat(inputtedHeight);
let cells = contentController.initGridUI(width, height);
let grid = contentController.initGridState(width, height);
contentController.updateGridUI(grid, cells);

function addEventListener(id, action) {
  // I want to use mousedown rather than click, because it's more snappy
  // but mousedown doesn't cover spacebar and enter-key presses
  // and if I register them both, then it causes both to trigger
  // so I check e.screenX to register whether it was an actual click,
  // and differentiate between mouse clicks and button clicks that way.
  document.getElementById(id).addEventListener("mousedown", (e) => {
    if (e.screenX) {
      action();
    }
  });
  document.getElementById(id).addEventListener("click", (e) => {
    if (!e.screenX) {
      action();
    }
  });
}

addEventListener("board-step-button", () => {
  const rangeForm = document.getElementById("grid-range")[0];
  const range = parseFloat(rangeForm.value);
  grid = contentController.updateGridState(grid, range);
  contentController.updateGridUI(grid, cells);
});
const runButton = document.getElementById("board-run-button");
addEventListener("board-run-button", () => {
  contentController.toggleRun(runButton, grid, cells);
});
addEventListener("board-restart-button", () => {
  const inputtedWidth = document.getElementById("bf-w")[0].value;
  const width = parseFloat(inputtedWidth) || 20;
  const inputtedHeight = document.getElementById("bf-h")[0].value;
  const height = parseFloat(inputtedHeight) || 20;
  cells = contentController.initGridUI(width, height);
  grid = contentController.initGridState(width, height);
  contentController.updateGridUI(grid, cells);
  contentController.stopRunning(runButton);
});
