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
    this.lastSelected = {
      cell: null,
      program: null,
      x: null,
      y: null,
    };
    this.copyIconEventListener = (e) => {
      navigator.clipboard.writeText(
        toHumanReadableStr(this.lastSelected.program)
      );
      document.getElementById("copy-icon-validation").style.display =
        "inline-block";
    };
    this.colorMapping = {
      0: "#F0F2F3", // white
      1: "#E64C3C", // red
      2: "#F29B11", // orange
      3: "#FFEA00", // yellow
      4: "#7A3E00", // brown
      5: "#145A32", // green
      6: "#90EE90", // light green
      7: "#1A5276", // blue
      8: "#A3E4D7", // cyan
      9: "#8E44AD", // purple
      10: "#FF69B4", // pink
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

  toColoredFormat(program) {
    const asHrString = toHumanReadableStr(program);
    const asChars = asHrString.split("");
    return program
      .map((num, index) => {
        const color = this.intToColor(num);
        // don't change the spacing, because it will effect the UI spacing
        return `<div 
                class="char-instruction" 
                style="background-color:${color};"
            >${asChars[index]}</div>`;
      })
      .join("");
  }

  getCellClickEventListener(program, cellElement, { x, y }) {
    const controller = this;
    return function (e) {
      controller.exitCellEditMode();
      const lastSelected = controller.lastSelected;
      lastSelected.x = x;
      lastSelected.y = y;
      if (lastSelected.program) {
        lastSelected.cell.style.border = "none";
        document.getElementById("cell-details").style.display = "none";
        document.getElementById("copy-icon-validation").style.display = "none";
        if (program == lastSelected.program) {
          lastSelected.program = null;
          return;
        }
      }
      lastSelected.program = program;
      lastSelected.cell = cellElement;

      document.getElementById("cell-details").style.display = "inline-block";
      document.getElementById("cell-details-1").innerText = program.join(",");
      document.getElementById("cell-details-2").innerHTML =
        controller.toColoredFormat(program);
      cellElement.style.border = "3px solid black";
    };
  }

  visualizeProgram(program, cellElement, x, y) {
    if (!cellElement) return;

    const canvas = document.createElement("canvas");
    // const previousCanvas = cellElement.getElementsByTagName("canvas")[0];
    canvas.id = `${x}_${y}`;
    canvas.width = 32;
    canvas.height = 32;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const updatesSet = {};
    for (let i = 0; i < 64; i++) {
      let rec_x = (i % 8) * 4;
      let rec_y = Math.floor(i / 8) * 4;
      const color = this.intToColor(program[i]);
      const updates = [rec_x, rec_y];
      if (!updatesSet[color]) {
        updatesSet[color] = [];
      }
      updatesSet[color].push(updates);
    }
    Object.keys(updatesSet).forEach((color) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      updatesSet[color].forEach((update) => {
        const [rec_x, rec_y] = update;
        ctx.rect(rec_x, rec_y, 4, 4);
      });
      ctx.fill()
    });

    const cellClickEventListener = this.getCellClickEventListener(
      program,
      cellElement,
      { x, y }
    );
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
    const container = document.getElementById("grid-container");
    container.innerHTML = "";

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
        const x2 =
          (i + Math.floor(Math.random() * (2 * range + 1)) - range + height) %
          height;
        const y2 =
          (j + Math.floor(Math.random() * (2 * range + 1)) - range + width) %
          width;
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
          i,
          j
        );
      }
    }
    document.getElementById(
      "step-counter"
    ).textContent = `Epoch: ${this.stepCount}`;
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
      this.updateGridUI(grid, cells);
    }, 1000 / speed);
  }

  enterCellEditMode() {
    document.getElementById("copy-icon").style.display = "none";
    document.getElementById("cell-details-1").style.display = "none";
    document.getElementById("cell-details-edit-button").style.display = "none";
    document.getElementById("cancel-button").style.display = "block";
    document.getElementById("cell-details-1-edit-form").style.display = "inline-flex";
    document.getElementById("cell-details-2").style.display = "none";
    document.getElementById("cell-details-2-edit-form").style.display = "inline-flex";
    const numInput = document.getElementById("cell-details-1-edit-input");
    const colorsInput = document.getElementById("cell-details-2-edit-input");
    numInput.value = this.lastSelected.program.join(",");
    colorsInput.value = toHumanReadableStr(this.lastSelected.program);
  }

  exitCellEditMode() {
    document.getElementById("copy-icon").style.display = "inline-block";
    document.getElementById("cell-details-1").style.display = "block";
    document.getElementById("cell-details-edit-button").style.display = "block";
    document.getElementById("cancel-button").style.display = "none";
    document.getElementById("cell-details-1-edit-form").style.display = "none";
    document.getElementById("cell-details-2").style.display = "inline-block";
    document.getElementById("cell-details-2-edit-form").style.display = "none";
  }

  editProgramWithNumsForm(grid) {
    const inputVal = document.getElementById("cell-details-1-edit-input").value;
    const isIntegerFormat = /^[,\-\d]+$/.test(inputVal)
    if (!isIntegerFormat) return;
    const intArr = inputVal.split(",").map(num => parseInt(num));
    const validValues = intArr.every((i) => !isNaN(i) && i !== null && i !== undefined);
    if (!validValues) return;
    this.submitProgram(intArr, grid);
  }

  editProgramWithColorsForm(grid) {
    const inputVal = document.getElementById("cell-details-2-edit-input").value;
    const textNoWhitespace = inputVal.replace(/\s+/g, '');
    const isHrBfFormat = /^[a-zA-Z0-9{}\-\+\<\>\.,\[\]%&]+$/.test(textNoWhitespace)
    if (!isHrBfFormat) return;
    const intArr = fromHumanReadableStr(textNoWhitespace);
    this.submitProgram(intArr, grid);
  }

  submitProgram(program, grid) {
    program = program.slice(0, 64)
    while (program.length < 64) program.push(0);
    this.lastSelected.program = program;
    document.getElementById("cell-details-1").innerText = program.join(",");
    document.getElementById("cell-details-2").innerHTML = this.toColoredFormat(program);
    const x = this.lastSelected.x;
    const y = this.lastSelected.y;
    grid[x][y] = program;
    this.exitCellEditMode();
    this.visualizeProgram(program, this.lastSelected.cell, x, y);
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
    e.preventDefault();
    if (e.screenX) {
      action();
    }
  });
  document.getElementById(id).addEventListener("click", (e) => {
    e.preventDefault();
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


addEventListener("cell-details-edit-button", () => {
  contentController.enterCellEditMode()
});
addEventListener("cancel-button", () => {
  contentController.exitCellEditMode();
});
document.getElementById("cell-details-1-edit-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      contentController.editProgramWithNumsForm(grid);
    }
  });
document.getElementById("cell-details-2-edit-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    contentController.editProgramWithColorsForm(grid);
  }
});
addEventListener("cell-details-1-edit-submit", () => {
    contentController.editProgramWithNumsForm(grid);
  });
addEventListener("cell-details-2-edit-submit", () => {
  contentController.editProgramWithColorsForm(grid);
});
