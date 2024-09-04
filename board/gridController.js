import { BrainfuckLogic } from "../shared/brainfuckLogic.js";
import { getLanguageMapping } from "../shared/readLanguageMapping.js";
import { Noise } from "./noise.js"

/* TYPES
  type Store: {State state, UiItems uiItems}
  type State: {int epoch, int uniqueCells, Grid previousGrid, Grid grid}
  type UiItems: CellUI[]
  type CellUI: {HTML canvas, CanvasRenderingContext2D ctx, function eventListener, HTML cellDiv}
  type LastSelected: {CellUI cellUI, Program program, Pos pos}
  type Pos: {int x, int y}
  type RunSpec: {int range, float speed, NoiseType noiseType, float(0-100) pctNoise, BrainfuckLogic bfLogic}
  type NoiseType: enum("none", "kill-cells", "kill-instructions")
  type Grid: Program[][]
  type Program: int[64]
  */

class GridController {
  constructor() {
    this.lastSelected = {
      cellUI: null,
      program: null,
      pos: null,
    };
    this.noiseMapping = {
      "kill-cells": "killCells",
      "kill-instructions": "killInstructions",
    };
    this.logic = new BrainfuckLogic(getLanguageMapping());
    this.toRedraw = false;
  }

  toColoredFormat(program) {
    const asHrString = this.logic.toHumanReadableStr(program);
    const asChars = asHrString.split("");
    return program
      .map((num, index) => {
        const color = this.logic.intToColor(num);
        // don't change the spacing, because it will effect the UI spacing
        return `<div 
                  class="char-instruction" 
                  style="background-color:${color};"
              >${asChars[index]}</div>`;
      })
      .join("");
  }

  countUniqueCells(grid) {
    const set = new Set();
    grid.forEach((row) => {
      row.forEach((cell) => {
        const stringified = JSON.stringify(cell);
        set.add(stringified);
      });
    });
    return set.size;
  }

  getCellClickEventListener(program, cellUI, pos) {
    const controller = this;
    return function (e) {
      controller.exitCellEditMode();
      const lastSelected = controller.lastSelected;
      lastSelected.pos = pos;
      if (lastSelected.program) {
        lastSelected.cellUI.cellDiv.style.border = "none";
        document.getElementById("cell-details").style.display = "none";
        document.getElementById("copy-icon-validation").style.display = "none";
        if (program == lastSelected.program) {
          lastSelected.program = null;
          return;
        }
      }
      lastSelected.program = program;
      lastSelected.cellUI = cellUI;

      document.getElementById("cell-details").style.display = "inline-block";
      document.getElementById("cell-details-1").innerText = program.join(",");
      document.getElementById("cell-details-2").innerHTML =
        controller.toColoredFormat(program);
      cellUI.cellDiv.style.border = "3px solid black";
    };
  }

  makeCanvas(cellDiv, { x, y }) {
    if (!cellDiv) return;
    const canvas = document.createElement("canvas");
    canvas.id = `${x}_${y}`;
    canvas.width = 32;
    canvas.height = 32;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    cellDiv.appendChild(canvas);
    return { canvas, ctx, cellDiv };
  }

  updateCellUI(program, prevProgram, cellUI, { x, y }) {
    const { canvas, ctx, eventListener } = cellUI;
    const updatesSet = {};
    for (let i = 0; i < 64; i++) {
      if (!this.toRedraw && prevProgram && program[i] === prevProgram[i]) {
        continue;
      }
      let rec_x = (i % 8) * 4;
      let rec_y = Math.floor(i / 8) * 4;
      const color = this.logic.intToColor(program[i]);
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
      ctx.fill();
    });

    if (eventListener) {
      canvas.removeEventListener("click", eventListener);
    }
    const newEventListener = this.getCellClickEventListener(program, cellUI, {
      x,
      y,
    });
    canvas.addEventListener("click", newEventListener);
    cellUI.eventListener = newEventListener;
  }

  initState(width, height) {
    this.isRunning = false;
    const epoch = 0;
    const grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => BrainfuckLogic.randomProgram())
    );
    const uniqueCells = this.countUniqueCells(grid);
    return { epoch, uniqueCells, grid };
  }

  initGridUI(width, height) {
    document.getElementById("copy-icon").addEventListener("click", (e) => {
      navigator.clipboard.writeText(
        this.logic.toHumanReadableStr(this.lastSelected.program)
      );
      document.getElementById("copy-icon-validation").style.display =
        "inline-block";
    });
    const container = document.getElementById("grid-container");
    container.innerHTML = "";
    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${width}, 3.5vmin)`;
    grid.style.gridTemplateRows = `repeat(${height}, 3.5vmin)`;
    grid.style.gap = ".4vmin";
    container.appendChild(grid);
    const uiItems = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const cell = document.createElement("div");
        cell.style.backgroundColor = "#fff";
        cell.style.cursor = "pointer";
        grid.appendChild(cell);
        let cellUI = this.makeCanvas(cell, { x, y });
        uiItems.push(cellUI);
      }
    }
    return uiItems;
  }

  deepCopy(grid) {
    const deepCopy = [];
    grid.forEach((row) => {
      const newRow = row.map((cell) => {
        return [...cell];
      });
      deepCopy.push(newRow);
    });
    return deepCopy;
  }

  updateState(state, { range, speed, noiseType, pctNoise, bfLogic }) {
    this.logic = bfLogic;
    let grid = this.deepCopy(state.grid);
    const height = grid.length;
    const width = grid[0].length;

    for (let x = 0; x < height; x++) {
      for (let y = 0; y < width; y++) {
        let xOff = Math.floor(Math.random() * (2 * range + 1)) - range;
        let x2 = (x + xOff + height) % height;
        let yOff = Math.floor(Math.random() * (2 * range + 1)) - range;
        let y2 = (y + yOff + width) % width;
        let [newProgram1, newProgram2] = this.logic.crossReactPrograms(
          grid[x][y],
          grid[x2][y2]
        );
        grid[x][y] = newProgram1;
        grid[x2][y2] = newProgram2;
      }
    }
    if (this.noiseMapping[noiseType]) {
      const funcName = this.noiseMapping[noiseType];
      const spec = { quantileKilled: pctNoise / 100 };
      grid = Noise[funcName](grid, spec);
    }
    return {
      epoch: state.epoch + 1,
      uniqueCells: this.countUniqueCells(state.grid),
      previousGrid: state.grid,
      grid: grid,
    };
  }

  backState(history, state, runSpec) {
    return history.getState(state.epoch - 1, (state) => {
      return this.updateState(state, runSpec);
    });
  }

  updateGridUI({ state, uiItems }) {
    const { epoch, uniqueCells, grid, previousGrid } = state;
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        let program = grid[x][y];
        let prevProgram = previousGrid ? previousGrid[x][y] : null;
        let cellUI = uiItems[x * grid[x].length + y];
        this.updateCellUI(program, prevProgram, cellUI, { x, y });
      }
    }
    this.toRedraw = false;
    document.getElementById("step-counter").textContent = `Epoch: ${epoch}`;
    document.getElementById(
      "unique-cells"
    ).textContent = `Unique Cells: ${uniqueCells}`;
  }

  stopRunning(button) {
    this.running = false;
    button.textContent = "Run";
    clearInterval(this.runInterval);
  }

  toggleRun(button, store, history, runSpec) {
    const speed = runSpec.speed;
    if (this.running) {
      this.stopRunning(button);
      return;
    }
    this.runningBackwards = speed < 0;
    if (this.runnningsBackward) speed *= -1;

    this.running = true;
    button.textContent = "Pause";
    this.runInterval = setInterval(() => {
      if (this.runningBackwards) {
        const newState = this.backState(history, store.state, runSpec);
        Object.assign(store.state, newState);
      } else if (speed > 0) {
        store.state = this.updateState(store.state, runSpec);
        history.addState(store.state);
      } else {
        return;
      }
      this.updateGridUI(store);
    }, 1000 / speed);
  }

  enterCellEditMode() {
    const map = {
      "copy-icon": "none",
      "cell-details-1": "none",
      "cell-details-edit-button": "none",
      "cancel-button": "block",
      "cell-details-1-edit-form": "inline-flex",
      "cell-details-2": "none",
      "cell-details-2-edit-form": "inline-flex",
    };
    Object.keys(map).forEach((selector) => {
      document.getElementById(selector).style.display = map[selector];
    });
    const numInput = document.getElementById("cell-details-1-edit-input");
    const colorsInput = document.getElementById("cell-details-2-edit-input");
    numInput.value = this.lastSelected.program.join(",");
    colorsInput.value = toHumanReadableStr(this.lastSelected.program);
  }

  exitCellEditMode() {
    const map = {
      "copy-icon": "inline-block",
      "cell-details-1": "block",
      "cell-details-edit-button": "block",
      "cancel-button": "none",
      "cell-details-1-edit-form": "none",
      "cell-details-2": "inline-block",
      "cell-details-2-edit-form": "none",
    };
    Object.keys(map).forEach((selector) => {
      document.getElementById(selector).style.display = map[selector];
    });
  }

  editProgramWithNumsForm(state) {
    const inputVal = document.getElementById("cell-details-1-edit-input").value;
    const isIntegerFormat = /^[,\-\d]+$/.test(inputVal);
    if (!isIntegerFormat) return;
    const intArr = inputVal.split(",").map((num) => parseInt(num));
    const validValues = intArr.every(
      (i) => !isNaN(i) && i !== null && i !== undefined
    );
    if (!validValues) return;
    this.submitProgram(intArr, state.grid);
  }

  editProgramWithColorsForm(state) {
    const inputVal = document.getElementById("cell-details-2-edit-input").value;
    const textNoWhitespace = inputVal.replace(/\s+/g, "");
    const isHrBfFormat = /^[a-zA-Z0-9{}\-\+\<\>\.,\[\]%&]+$/.test(
      textNoWhitespace
    );
    if (!isHrBfFormat) return;
    const intArr = this.logic.fromHumanReadableStr(textNoWhitespace);
    this.submitProgram(intArr, state.grid);
  }

  submitProgram(program, grid) {
    program = program.slice(0, 64);
    while (program.length < 64) program.push(0);
    this.lastSelected.program = program;
    document.getElementById("cell-details-1").innerText = program.join(",");
    document.getElementById("cell-details-2").innerHTML =
      this.toColoredFormat(program);
    const { x, y } = this.lastSelected.pos;
    const prevProgram = grid[x][y];
    grid[x][y] = program;
    this.exitCellEditMode();
    this.updateCellUI(program, prevProgram, this.lastSelected.cellUI, { x, y });
  }

  getRunSpec() {
    const rangeForm = document.getElementById("grid-range")[0];
    const range = parseFloat(rangeForm.value);
    const speedForm = document.getElementById("grid-speed")[0];
    const speed = parseFloat(speedForm.value);
    const noiseType = document.getElementById("noise").value;
    const pctNoiseStr = document.getElementById("percent-noise")[0].value;
    const pctNoise = parseFloat(pctNoiseStr.slice(0, pctNoiseStr.length - 1));
    const languageMapping = getLanguageMapping();
    const bfLogic = new BrainfuckLogic(languageMapping);
    this.toRedraw = !this.logic.matches(bfLogic);
    return { range, speed, noiseType, pctNoise, bfLogic };
  }
}

export { GridController }