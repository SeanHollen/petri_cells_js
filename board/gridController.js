import { BrainfuckLogic } from "../shared/brainfuckLogic.js";
import { getLanguageMapping } from "../shared/readLanguageMapping.js";
import { Noise } from "./noise.js"
import { Mulberry32, hashStringToInt } from "./rng.js";
import miscSettings from "../miscSettings.js";

/* TYPES
  class GridController: {
    LastSelected lastSelected
    BrainfuckLogic logic
    function runInterval
  }
  type Store: {
    State state
    UiItems uiItems
    TimeDirection timeDirection
  }
  type State: {
    int epoch
    int uniqueCells
    Grid previousGrid
    Grid grid
    Mulberry32 rng
  }
  // running backwards, paused, running
  type TimeDirection: enum(-1, 0, 1)
  type UiItems: CellUI[]
  type CellUI: {
    HTML canvas
    CanvasRenderingContext2D ctx
    function eventListener
    HTML cellDiv
  }
  type LastSelected: {
    CellUI cellUI
    Program program
    Pos pos
    Pos lastReactedWith
  }
  type Pos: {
    int x
    int y
  }
  type RunSpec: {
    int range
    float speed
    NoiseAction noiseAction
    float(0-100) pctNoise
    BrainfuckLogic bfLogic
    // whether the color scheme has changed, requiring a cancel of rendering tricks
    boolean toRecolor
  }
  type NoiseAction: enum("none", "killCells", "killInstructions")
  type Grid: Program[][]
  type Program: int[64]
  */

class GridController {
  constructor() {
    this.lastSelected = {};
    const languageMapping = getLanguageMapping();
    this.logic = new BrainfuckLogic(languageMapping);
    this.cellPxlSize = 32;
    this.vmin = 3.5;
    this.gap = 0.4;
    this.mainBorderPxl = 3;
    this.altBorderPxl = 2;
  }

  initStateHelper(width, height, rng, lambda) {
    this.tuples = [];
    for (let x = 0; x < height; x++) {
      for (let y = 0; y < width; y++) {
        this.tuples.push([x, y]);
      }
    }
    const grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, lambda)
    );
    return {
      epoch: 0,
      uniqueCells: this.countUniqueCells(grid),
      grid: grid,
      previousGrid: null,
      rng: rng,
    }
  }

  initState({width, height, programLength, seed}) {
    const rng = new Mulberry32(seed);
    const lambda = () => BrainfuckLogic.randomProgram(programLength, rng);
    return this.initStateHelper(width, height, rng, lambda);
  }

  initStateToData(width, height, programLength, seed) {
    const rng = new Mulberry32(seed);
    const lambda = () => BrainfuckLogic.randomData(programLength, rng);
    return this.initStateHelper(width, height, rng, lambda);
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
      document.getElementById("cell-details-0").innerText = `(${pos.x},${pos.y})`;
      document.getElementById("cell-details-1").innerText = program.join(",");
      document.getElementById("cell-details-2").innerHTML =
        controller.toColoredFormat(program);
      cellUI.cellDiv.style.border = `${controller.mainBorderPxl}px solid black`;
    };
  }

  makeCanvas(cellDiv, { x, y }) {
    if (!cellDiv) return;
    const canvas = document.createElement("canvas");
    canvas.id = `${x}_${y}`;
    canvas.width = this.cellPxlSize;
    canvas.height = this.cellPxlSize;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    cellDiv.appendChild(canvas);
    return { canvas, ctx, cellDiv };
  }

  highlightSelected(cellDiv, pos) {
    if (cellDiv.style.border === `${this.altBorderPxl}px solid green`) {
      cellDiv.style.border = '';
    }
    if (!this.lastSelected.program) {
      return;
    }
    const rPos = this.lastSelected.lastReactedWith;
    if (cellDiv.style.border === "" && rPos && pos.x === rPos.x && pos.y === rPos.y) {
      cellDiv.style.border = `${this.altBorderPxl}px solid green`;
    }
  }

  updateCellUI(program, prevProgram, cellUI, pos, toRecolor) {
    const { canvas, ctx, eventListener, cellDiv } = cellUI;
    this.highlightSelected(cellDiv, pos);
    const updatesSet = {};
    const sqrt = Math.sqrt(program.length);
    const scalar = this.cellPxlSize / sqrt;
    for (let i = 0; i < program.length; i++) {
      if (!toRecolor && prevProgram && program[i] === prevProgram[i]) {
        continue;
      }
      let recX = (i % sqrt) * scalar;
      let recY = Math.floor(i / sqrt) * scalar;
      const color = this.logic.intToColor(program[i]);
      const updates = [recX, recY];
      if (!updatesSet[color]) {
        updatesSet[color] = [];
      }
      updatesSet[color].push(updates);
    }
    Object.keys(updatesSet).forEach((color) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      updatesSet[color].forEach((update) => {
        const [recX, recY] = update;
        ctx.rect(recX, recY, scalar, scalar);
      });
      ctx.fill();
    });

    if (eventListener) {
      canvas.removeEventListener("mousedown", eventListener);
    }
    const newEventListener = this.getCellClickEventListener(program, cellUI, pos);
    canvas.addEventListener("mousedown", newEventListener);
    cellUI.eventListener = newEventListener;
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
    grid.style.gridTemplateColumns = `repeat(${width}, ${this.vmin}vmin)`;
    grid.style.gridTemplateRows = `repeat(${height}, ${this.vmin}vmin)`;
    grid.style.gap = `${this.gap}vmin`;
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
    return grid.map((row) => {
      return [...row];
    });
  }

  updateState(state, { range, noiseAction, pctNoise, bfLogic }) {
    this.logic = bfLogic;
    let grid = this.deepCopy(state.grid);
    const rng = state.rng;
    const height = grid.length;
    const width = grid[0].length;
    const outRange = 2 * range + 1;
    const seen = new Array(width * height).fill(false);

    const tuples = [...this.tuples].sort(() => rng.random() - 0.5);
    tuples.forEach((tuple) => {
      const [x, y] = tuple
      const xOff = Math.floor(rng.random() * outRange) - range;
      const x2 = (x + xOff + height) % height;
      const yOff = Math.floor(rng.random() * outRange) - range;
      const y2 = (y + yOff + width) % width;
      if (seen[x * width + y] || seen[x2 * width + y2]) {
        return;
      }
      const [new1, new2] = miscSettings.toRandomPivot 
        ? this.logic.crossProgramsWithRotation(grid[x][y], grid[x2][y2], rng)
        : this.logic.crossReactPrograms(grid[x][y], grid[x2][y2])
      grid[x][y] = new1;
      grid[x2][y2] = new2;
      seen[x * width + y] = true;
      seen[x2 * width + y2] = true;
      if (this.lastSelected.program) {
        const lastSelectedPos = this.lastSelected.pos;
        if (x === lastSelectedPos.x && y === lastSelectedPos.y) {
          this.lastSelected.lastReactedWith = {x: x2, y: y2};
        } else if (x2 === lastSelectedPos.x && y2 === lastSelectedPos.y) {
          this.lastSelected.lastReactedWith = {x: x, y: y};
        }
      }
    });
    if (noiseAction) {
      const spec = { quantileKilled: pctNoise / 100 };
      grid = Noise[noiseAction](grid, rng, spec);
    }
    return {
      rng: rng,
      epoch: state.epoch + 1,
      uniqueCells: this.countUniqueCells(grid),
      previousGrid: state.grid,
      grid: grid,
    };
  }

  backState(history, state) {
    return history.get(state.epoch - 1);
  }

  updateGridUI({ state, uiItems }, toRecolor) {
    const { epoch, uniqueCells, grid, previousGrid } = state;
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        let program = grid[x][y];
        let prevProgram = previousGrid ? previousGrid[x][y] : null;
        let cellUI = uiItems[x * grid[x].length + y];
        this.updateCellUI(program, prevProgram, cellUI, { x, y }, toRecolor);
      }
    }
    document.getElementById("step-counter").textContent = `Epoch: ${epoch}`;
    document.getElementById(
      "unique-cells"
    ).textContent = `Unique Cells: ${uniqueCells}`;
  }

  stopRunning(store, button) {
    store.timeDirection = 0;
    button.textContent = "Run";
    clearInterval(this.runInterval);
  }

  toggleRun(button, store, history, runSpec) {
    let speed = runSpec.speed;
    if (store.timeDirection === 1 || store.timeDirection === -1) {
      this.stopRunning(store, button);
      return;
    }
    if (speed < 0) {
      store.timeDirection = -1;
      speed *= -1
    } else if (speed > 0) {
      store.timeDirection = 1;
    }

    button.textContent = "Pause";
    this.runInterval = setInterval(() => {
      if (store.timeDirection === -1) {
        const newState = this.backState(history, store.state);
        Object.assign(store.state, newState);
      } else if (store.timeDirection === 1) {
        store.state = this.updateState(store.state, runSpec);
        history.noteState(store.state);
      } else {
        return;
      }
      this.updateGridUI(store, runSpec.toRecolor);
      runSpec.toRecolor = false;
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
    colorsInput.value = this.logic.toHumanReadableStr(this.lastSelected.program);
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

  editProgramWithNumsForm(state, inputVal) {
    const isIntegerFormat = /^[,\-\d]+$/.test(inputVal);
    if (!isIntegerFormat) return;
    const intArr = inputVal.split(",").map((num) => parseInt(num));
    const validValues = intArr.every(
      (i) => !isNaN(i) && i !== null && i !== undefined
    );
    if (!validValues) return;
    this.submitProgram(intArr, state.grid);
  }

  editProgramWithColorsForm(state, inputVal) {
    const textNoWhitespace = inputVal.replace(/\s+/g, "");
    const isHrBfFormat = /^[a-zA-Z0-9{}\-\+\<\>\.,\[\]%&]+$/.test(
      textNoWhitespace
    );
    if (!isHrBfFormat) return;
    const intArr = this.logic.fromHumanReadableStr(textNoWhitespace);
    this.submitProgram(intArr, state.grid);
  }

  submitProgram(program, grid) {
    const typicalProgramLength = grid[0][0].length;
    program = program.slice(0, typicalProgramLength);
    while (program.length < typicalProgramLength) program.push(0);
    this.lastSelected.program = program;
    document.getElementById("cell-details-1").innerText = program.join(",");
    document.getElementById("cell-details-2").innerHTML =
      this.toColoredFormat(program);
    const { x, y } = this.lastSelected.pos;
    const prevProgram = grid[x][y];
    grid[x][y] = program;
    this.exitCellEditMode();
    this.updateCellUI(program, prevProgram, this.lastSelected.cellUI, { x, y }, false);
  }

  getRunSpec() {
    const rangeForm = document.getElementById("grid-range")[0];
    const range = parseFloat(rangeForm.value);
    const speedForm = document.getElementById("grid-speed")[0];
    const speed = parseFloat(speedForm.value);
    const noiseType = document.getElementById("noise").value;
    const noiseAction = {
      "kill-cells": "killCells",
      "kill-instructions": "killInstructions",
    }[noiseType];
    const pctNoiseStr = document.getElementById("percent-noise")[0].value;
    const pctNoise = parseFloat(pctNoiseStr.slice(0, pctNoiseStr.length - 1));
    const languageMapping = getLanguageMapping();
    const bfLogic = new BrainfuckLogic(languageMapping);
    const toRecolor = !this.logic.matches(bfLogic);
    return { range, speed, noiseAction, pctNoise, bfLogic, toRecolor };
  }

  getSeed() {
    const seedInput = document.getElementById("seed")[0].value;
    if (seedInput === "") {
      return Math.floor(Math.random() * 4294967296) >>> 0;
    } else if (!isNaN(parseInt(seedInput))) {
      return parseInt(seedInput);
    } else {
      return hashStringToInt(seedInput) * 4294967296;
    }
  }

  getInitSpec() {
    const inputtedWidth = document.getElementById("bf-w")[0].value;
    const width = parseInt(inputtedWidth) || 20;
    const inputtedHeight = document.getElementById("bf-h")[0].value;
    const height = parseInt(inputtedHeight) || 20;
    const inputtedProgramLength = document.getElementById("cell-size").value;
    const programLength = parseInt(inputtedProgramLength) || 64;
    const seed = this.getSeed()
    return { width, height, programLength, seed };
  }

  placeProgramsRandomly(grid, programs, rng) {
    const height = grid.length;
    const width = grid[0].length;
    const placed = new Set();
    programs.forEach((program) => {
      let x, y;
      do {
        x = Math.floor(rng.random() * height);
        y = Math.floor(rng.random() * width);
      } while (placed.has(`${x}${x}`));
      placed.add(`${x}${y}`);
      grid[x][y] = program;
    })

    return grid;
  }
}

export { GridController }
