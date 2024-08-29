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
  intToColor(num) {
    const colorMapping = {
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

    if (num in colorMapping) {
      return colorMapping[num];
    } else if (num < 0) {
      const x = Math.max(0, 256 + num);
      return `rgb(${x},${x},${x})`;
    } else if (num > 10) {
      const x = Math.max(0, 1 - num);
      const r = Math.max(0, x - 10);
      return `rgb(${r},${x},${x})`;
    }
  }

  visualizeProgram(program, cellElement) {
    if (!cellElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < 64; i++) {
      const x = (i % 8) * 4;
      const y = Math.floor(i / 8) * 4;
      const color = this.intToColor(program[i]);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 4, 4);
    }

    canvas.addEventListener('click', (event) => {
      const cellDetails1 = document.getElementById("cell-details-1")
      cellDetails1.innerText = program.join(",")
      const cellDetails2 = document.getElementById("cell-details-2")
      cellDetails2.innerText = toHumanReadableStr(program)
    });

    cellElement.innerHTML = "";
    cellElement.appendChild(canvas);
    cellElement.style.aspectRatio = "1 / 1";
  }

  initGridState(width, height) {
    this.isRunning = false;
    this.stepCount = 0;
    return Array.from({ length: height }, () =>
      Array.from({ length: width }, () => randomProgram())
    );
  }

  initGridUI(width, height) {
    const container = document.getElementById("lifeBoard");
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
    grid.style.padding = ".4vmin";
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

  updateGridState(grid) {
    this.stepCount++;
    const height = grid.length;
    const width = grid[0].length;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const x2 = (i + Math.floor(Math.random() * 5) - 2 + height) % height;
        const y2 = (j + Math.floor(Math.random() * 5) - 2 + width) % width;
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
        this.visualizeProgram(grid[i][j], cells[i * grid[i].length + j]);
      }
    }
    document.getElementById("stepCounter").textContent = `Step: ${this.stepCount}`;
  }

  stopRunning(button) {
    this.running = false;
    button.textContent = 'Run';
    clearInterval(this.runInterval);
  }

  toggleRun(button, grid, cells) {
    if (this.running) {
      this.stopRunning(button)
    } else {
      const speedForm = document.getElementById('gridSpeed')[0];
      const speed = parseFloat(speedForm.value);

      this.running = true;
      button.textContent = 'Pause';
      this.runInterval = setInterval(() => {
        grid = this.updateGridState(grid);
        this.updateGridUI(grid, cells);
      }, 1000 / speed);
    }
  }

  onClick(index) {
    // TODO
    console.log("click");
  }
}


const WIDTH = 20;
const HEIGHT = 20;
const contentController = new GridController();
let grid = contentController.initGridState(WIDTH, HEIGHT);
const cells = contentController.initGridUI(WIDTH, HEIGHT);
contentController.updateGridUI(grid, cells);
document.getElementById("boardStepButton").addEventListener("click", () => {
  grid = contentController.updateGridState(grid);
  contentController.updateGridUI(grid, cells);
});
const runButton = document.getElementById("boardRunButton")
runButton.addEventListener("click", () => {
  contentController.toggleRun(runButton, grid, cells);
});
document.getElementById("boardRestartButton").addEventListener("click", () => {
  grid = contentController.initGridState(WIDTH, HEIGHT);
  contentController.updateGridUI(grid, cells);
  contentController.stopRunning(runButton)
});
