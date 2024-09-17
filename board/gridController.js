import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import { BrainfuckLogic } from "../shared/brainfuckLogic.js";
import { getLanguageMapping } from "../shared/readLanguageMapping.js";
import { Noise } from "./noise.js"
import { Mulberry32, hashStringToInt } from "./rng.js";
import { Cell } from "./cell.js"
import miscSettings from "../miscSettings.js";

class GridController {
  constructor() {
    this.lastSelected = {};
    const languageMapping = getLanguageMapping();
    this.logic = new BrainfuckLogic(languageMapping);
    this.miscSettings = miscSettings;
  }

  initState({width, height, programLength, seed}) {
    const rng = new Mulberry32(seed);
    const initializationMode = this.miscSettings.initializationMode;
    this.tuples = [];
    for (let x = 0; x < height; x++) {
      for (let y = 0; y < width; y++) {
        this.tuples.push([x, y]);
      }
    }
    const grid = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => {
        if (initializationMode === "dataOnly") {
          return BrainfuckLogic.randomData(programLength, rng);
        }
        return BrainfuckLogic.randomProgram(programLength, rng);
      })
    );
    return {
      epoch: 0,
      uniqueCells: width * height,
      grid: grid,
      rng: rng,
    }
  }

  updateState(state, runSpec) {
    const { range, noiseAction, pctNoise, bfLogic } = runSpec;
    this.logic = bfLogic;
    const grid = state.grid;
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
      const [new1, new2] = this.miscSettings.toRandomPivot 
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
      uniqueCells: this._countUniqueCells(grid),
      grid: grid,
    };
  }

  _countUniqueCells(grid) {
    const set = new Set();
    grid.forEach((row) => {
      row.forEach((cell) => {
        const stringified = JSON.stringify(cell);
        set.add(stringified);
      });
    });
    return set.size;
  }

  backState(history, state) {
    return history.get(state.epoch - 1);
  }

  clear(uiItems) {
    const { cells, scene } = uiItems;
    cells.forEach((cell) => {
      cell.removeCell(scene)
    })
  }

  initGridUI() {
    this._addCopyIconEventListener();
    const { screenSize } = this.miscSettings;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      screenSize / -2, screenSize / 2, screenSize / 2, screenSize / -2, 0.1, 10
    );
    camera.position.z = 1;
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(screenSize, screenSize);
    renderer.setClearColor(0xffffff, 1);
    const canvasContainer = document.getElementById("grid-container");
    canvasContainer.appendChild(renderer.domElement);
    return { scene, camera, renderer};
  }

  _addCopyIconEventListener() {
    document.getElementById("copy-icon").addEventListener("click", (e) => {
      navigator.clipboard.writeText(
        this.logic.toHumanReadableStr(this.lastSelected.program)
      );
      document.getElementById("copy-icon-validation").style.display =
        "inline-block";
    });
  }

  updateGridUI({ state, uiItems }, toRecolor) {
    const { epoch, uniqueCells, grid } = state;
    this.updateCounters(epoch, uniqueCells);
    if (!uiItems.cells || toRecolor) {
      uiItems.cells = this.createGridCells(grid, uiItems.scene);
    } else {
      this.updateGridCells(grid, uiItems.cells);
    }
    this.reRender(uiItems)
  }

  reRender(uiItems) {
    const { renderer, scene, camera } = uiItems;
    renderer.render(scene, camera);
  }

  updateCounters(epoch, uniqueCells) {
    document.getElementById("step-counter").textContent = `Epoch: ${epoch}`;
    document.getElementById(
      "unique-cells"
    ).textContent = `Unique Cells: ${uniqueCells}`;
  }

  createGridCells(grid, scene) {
    const cells = [];
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const program = grid[x][y];
        const cell = new Cell(x, y)
        cell.createMesh(
          program, 
          grid.length, 
          grid[x].length,
          scene,
          this.logic
        );
        cells.push(cell);
      }
    }
    return cells;
  }

  updateGridCells(grid, cells) {
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const program = grid[x][y];
        const i = x * grid[x].length + y;
        const cell = cells[i];
        cell.updateMesh(program, this.logic);
      }
    }
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
      if (store.timeDirection == 0) {
        return;
      }
      if (store.timeDirection === -1) {
        const newState = this.backState(history, store.state);
        Object.assign(store.state, newState);
      } 
      if (store.timeDirection === 1) {
        store.state = this.updateState(store.state, runSpec);
        if (this.miscSettings.storeStateWhenRunning) {
          history.noteState(store.state);
        }
      }
      this.updateGridUI(store, runSpec.toRecolor);
      runSpec.toRecolor = false;
    }, 1000 / speed);
  }

  stopRunning(store, button) {
    store.timeDirection = 0;
    button.textContent = "Run";
    clearInterval(this.runInterval);
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

  editProgramWithNumsForm(state, inputVal, uiItems) {
    const isIntegerFormat = /^[,\-\d]+$/.test(inputVal);
    if (!isIntegerFormat) return;
    const intArr = inputVal.split(",").map((num) => parseInt(num));
    const validValues = intArr.every(
      (i) => !isNaN(i) && i !== null && i !== undefined
    );
    if (!validValues) return;
    this.submitProgram(intArr, state.grid, uiItems);
  }

  editProgramWithColorsForm(state, inputVal, uiItems) {
    const textNoWhitespace = inputVal.replace(/\s+/g, "");
    const isHrBfFormat = /^[a-zA-Z0-9{}\-\+\<\>\.,\[\]%&]+$/.test(
      textNoWhitespace
    );
    if (!isHrBfFormat) return;
    const intArr = this.logic.fromHumanReadableStr(textNoWhitespace);
    this.submitProgram(intArr, state.grid, uiItems);
  }

  submitProgram(program, grid, uiItems) {
    const typicalProgramLength = grid[0][0].length;
    program = program.slice(0, typicalProgramLength);
    while (program.length < typicalProgramLength) program.push(0);
    this.lastSelected.program = program;
    this.showSelectedCellDetails(this.lastSelected.pos, program);
    const { x, y } = this.lastSelected.pos;
    grid[x][y] = program;
    this.exitCellEditMode();
    this.lastSelected.cell.updateMesh(program, this.logic);
    this.reRender(uiItems);
  }

  _toColoredFormat(program) {
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
    const seed = this.getSeed();
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

  onMouseDown(event, grid, uiItems) {
    const { renderer, camera, scene, cells } = uiItems;
    const { screenSize } = this.miscSettings;
    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / screenSize) * 2 - 1;
    mouse.y = - ((event.clientY - rect.top) / screenSize) * 2 + 1;
  
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
  
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
      const object = intersects[0].object;
      const pos = object.userData.gridPosition;
      const { x, y } = pos;
      const program = grid[x][y];
      const cell = cells[x * grid.length + y];
      this.clickGrid(pos, program, cell);
    }
  }

  clickGrid(pos, program, cell) {
    this.exitCellEditMode();
    if (!!this.lastSelected.cell) {
      this.lastSelected.cell.markNotSelected();
      this.hideSelectedCellDetails();
    }
    if (this.lastSelected.program == program) {
      this.lastSelected = {};
      return;
    }
    this.lastSelected = { program, cell, pos };
    this.showSelectedCellDetails(pos, program)
    cell.markSelected();
  };

  showSelectedCellDetails(pos, program) {
    const posStr = `(${pos.x},${pos.y})`;
    const coloredDescription = this._toColoredFormat(program);
    const intFormat = program.join(",");
    document.getElementById("cell-details").style.display = "inline-block";
    document.getElementById("cell-details-0").innerText = posStr;
    document.getElementById("cell-details-1").innerText = intFormat;
    document.getElementById("cell-details-2").innerHTML = coloredDescription;
  }

  hideSelectedCellDetails() {
    document.getElementById("cell-details").style.display = "none";
    document.getElementById("copy-icon-validation").style.display = "none";
  }
}

export { GridController }
