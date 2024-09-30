import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";
import { BrainfuckLogic } from "../shared/brainfuckLogic.js";
import { getLanguageMapping } from "../shared/readLanguageMapping.js";
import { Noise } from "./noise.js";
import { Mulberry32, hashStringToInt } from "./rng.js";
import { Cell } from "./cell.js";
import { MeshStore } from "./meshStore.js";
import miscSettings from "../miscSettings.js";
import {
  inflate,
  deflate,
} from "https://cdn.jsdelivr.net/npm/pako@latest/dist/pako.esm.mjs";

class GridController {
  constructor() {
    this.lastSelected = {};
    const languageMapping = getLanguageMapping();
    this.logic = new BrainfuckLogic(languageMapping);
    this.miscSettings = miscSettings;
  }

  // create state objects
  initState({ width, height, programLength, seed }) {
    const rng = new Mulberry32(seed);
    const initializationMode = this.miscSettings.initializationMode;
    this.tuples = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        this.tuples.push([x, y]);
      }
    }
    const grid = Array.from({ length: width }, () =>
      Array.from({ length: height }, () => {
        if (initializationMode === "dataOnly") {
          return BrainfuckLogic.randomData(programLength, rng);
        }
        return BrainfuckLogic.randomProgram(programLength, rng);
      })
    );
    const compression = this._calculateCompression(grid);
    return {
      epoch: 0,
      uniqueCells: width * height,
      compression: compression,
      grid: grid,
      rng: rng,
    };
  }

  // move state progress forward one step
  updateState(state, runSpec, updateAll) {
    const { range, noiseAction, pctNoise, bfLogic } = runSpec;
    this.logic = bfLogic;
    let grid = state.grid;
    const rng = state.rng;
    const height = grid.length;
    const width = grid[0].length;
    const outRange = 2 * range + 1;
    const seen = new Array(width * height).fill(false);

    const selected = this.lastSelected.pos;
    this._getShuffled(this.tuples, rng).forEach((tuple) => {
      const [x, y] = tuple;
      const xOff = Math.floor(rng.random() * outRange) - range;
      const x2 = (x + xOff + height) % height;
      const yOff = Math.floor(rng.random() * outRange) - range;
      const y2 = (y + yOff + width) % width;
      if (seen[x * width + y] || seen[x2 * width + y2]) {
        return;
      }
      const [new1, new2] = this.miscSettings.toRandomPivot
        ? this.logic.crossProgramsWithRotation(grid[x][y], grid[x2][y2], rng)
        : this.logic.crossReactPrograms(grid[x][y], grid[x2][y2]);
      grid[x][y] = new1;
      grid[x2][y2] = new2;
      seen[x * width + y] = true;
      seen[x2 * width + y2] = true;
      if (!!selected) {
        if (x === selected.x && y === selected.y) {
          this.lastSelected.lastReactedWith = { x: x2, y: y2, order: 1 };
        } else if (x2 === selected.x && y2 === selected.y) {
          this.lastSelected.lastReactedWith = { x: x, y: y, order: 0 };
        }
      }
    });
    if (noiseAction) {
      const spec = { quantileKilled: pctNoise / 100 };
      grid = Noise[noiseAction](grid, rng, spec);
    }
    let compression = state.compression;
    if (updateAll || (state.epoch * 10) % runSpec?.speed === 0) {
      compression = this._calculateCompression(grid);
    }
    return {
      rng: rng,
      epoch: state.epoch + 1,
      uniqueCells: this._countUniqueCells(grid),
      compression: compression,
      grid: grid,
    };
  }

  _getShuffled(array, rng) {
    const taggedValues = array.map((value) => {
      return { value, sort: rng.random() };
    });
    const sorted = taggedValues.sort((a, b) => a.sort - b.sort);
    return sorted.map(({ value }) => value);
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

  _calculateCompression(grid) {
    const flat = grid.flat(2);
    const compressed = deflate(new Uint8Array(flat));
    const cRatio = flat.length / compressed.length;
    const rounded = Math.floor(cRatio * 100) / 100;
    return rounded;
  }

  // slow, but closer to the "complexity" measure in the paper
  _calcAvgComplexity(grid) {
    const flat = grid.flat();
    const total = flat.reduce((sum, program) => {
      const entropy = this._entropy(program);
      const compressed = deflate(new Uint8Array(program));
      const cratio = compressed.length / program.length;
      const complexity = entropy - cratio;
      return sum + complexity;
    }, 0);
    const avgComplexity = total / flat.length;
    const rounded = Math.floor(avgComplexity * 100) / 100;
    return rounded;
  }

  _entropy(program) {
    const dict = {};
    program.forEach((x) => {
      if (!dict[x]) dict[x] = 0;
      dict[x]++;
    });
    return Object.values(dict).reduce((entropy, count) => {
      const px = count / program.length;
      return entropy - px * Math.log(px, 2);
    }, 0);
  }

  // move state progress back to the last epoch in history
  backState(history, state) {
    delete this.lastSelected.lastReactedWith;
    const newState = history.get(state.epoch - 1);
    return newState;
  }

  // cleanup everything associated with uiItems
  clearUI(uiItems) {
    const { cells, scene } = uiItems;
    this.deSelectCell();
    cells.forEach((cell) => {
      cell.markNotSelected();
    });
    // "..." to clone the array, because otherwise, the concurrent modification
    // leads to unexpected behavior, where only the first one gets removed
    [...scene.children].forEach((child) => {
      scene.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    });
  }

  // create objects associated with uiItems, except for cells (see createGridCells)
  initGridUI() {
    this._addCopyIconEventListener();
    const { screenSize } = this.miscSettings;
    const scene = new THREE.Scene();
    const a = screenSize / -2;
    const b = screenSize / 2;
    const camera = new THREE.OrthographicCamera(a, b, b, a, 0.1, 10);
    camera.position.z = 1;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(screenSize, screenSize);
    renderer.setClearColor(0xffffff, 1);
    const canvasContainer = document.getElementById("grid-container");
    canvasContainer.appendChild(renderer.domElement);
    return { scene, camera, renderer };
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

  // look through state and make sure that everything is reflected in uiItems
  updateGridUI({ state, uiItems }, spec) {
    this._updateCounters(state);
    this._updateGridCells(state.grid, uiItems.cells, spec?.toRecolor);
    const atHighSpeed = spec?.speed > 50;
    if (!atHighSpeed) {
      this._markReactedWith(state.grid, uiItems.cells);
    }
    this.reRender(uiItems);
  }

  // trigger a re-draw of the screen
  reRender(uiItems) {
    const { renderer, scene, camera } = uiItems;
    renderer.render(scene, camera);
  }

  _updateCounters(state) {
    const { epoch, uniqueCells, compression } = state;
    const mapping = {
      "step-counter": `Epoch: ${epoch}`,
      "unique-cells": `Unique Cells: ${uniqueCells}`,
      compression: `Compression: ${compression}`,
    };
    Object.keys(mapping).forEach((k) => {
      document.getElementById(k).textContent = mapping[k];
    });
  }

  // creates the uiItems.cells objects from scratch, based on state
  createGridCells(grid, scene) {
    const cells = [];
    const w = grid.length;
    const h = grid[0].length;
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const p = grid[x][y];
        const cell = new Cell(x, y, w, h, scene, p);
        cells.push(cell);
      }
    }
    const typicalProgramLen = grid[0][0].length;
    const meshStore = this._createMesh(cells, typicalProgramLen);
    meshStore.addMeshesToScene(scene);
    cells.forEach((cell, i) => {
      const { mesh, writeIndex } = meshStore.propsForNthCell(i);
      cell.setMeshProperties(mesh, writeIndex);
    });
    return { cells, meshStore };
  }

  _createMesh(cells, typicalProgramLen) {
    const meshStore = new MeshStore();
    const numCells = cells.length;
    meshStore.initMeshes(numCells, typicalProgramLen);
    const partitions = meshStore.partitionCells(cells);
    partitions.forEach(({ mesh, cellGroup }) => {
      this._setPositionsBuffer(mesh, cellGroup);
      this._setColorsBuffer(mesh, cellGroup);
    });
    return meshStore;
  }

  _initMesh(width, height) {
    const { cellPxlSize, cellPaddingPxl } = this.miscSettings;
    const ply = cellPxlSize + cellPaddingPxl;
    const pxlWidth = width * ply;
    const pxlHeight = height * ply;
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    const geometry = new THREE.PlaneGeometry(pxlWidth, pxlHeight);
    const gridMesh = new THREE.Mesh(geometry, material);
    gridMesh.position.set(0, 0, 0);
    return gridMesh;
  }

  _setPositionsBuffer(gridMesh, cells) {
    const vertices = [];
    const indices = [];
    let idxPointer = 0;
    cells.forEach((cell) => {
      const { cellVerticies, cellIndices } =
        cell.cellPositionsBuffer(idxPointer);
      vertices.push(...cellVerticies);
      indices.push(...cellIndices);
      idxPointer += cellVerticies.length / 3;
    });
    const buffer = new THREE.Float32BufferAttribute(vertices, 3);
    gridMesh.geometry.setAttribute("position", buffer);
    gridMesh.geometry.setIndex(indices);
  }

  _setColorsBuffer(gridMesh, cells) {
    const colorsBuffer = [];
    cells.forEach((cell) => {
      const cellColors = cell.cellColorsBuffer(this.logic);
      colorsBuffer.push(...cellColors);
    });
    const buffer = new THREE.Float32BufferAttribute(colorsBuffer, 3);
    gridMesh.geometry.setAttribute("color", buffer);
  }

  _updateGridCells(grid, cells, toRecolor) {
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const program = grid[x][y];
        const i = x * grid[x].length + y;
        const cell = cells[i];
        cell.update(program, this.logic, toRecolor);
      }
    }
  }

  _markReactedWith(grid, cells) {
    if (!!this.lastSelected.lastReactedWith) {
      const cell = this.lastSelected.cell;
      const { x, y, order } = this.lastSelected.lastReactedWith;
      const i = x * grid[x].length + y;
      const reactedWithCell = cells[i];
      cell.markReactedWith(reactedWithCell, order);
    }
  }

  // push state to history, and make sure any changes to runSpec will effect the run
  save(store, history, runSpec) {
    this.logic = runSpec.bfLogic;
    const timeDirection = store.timeDirection;
    this.stopRunning(store);
    history.addState(store.state);
    if (timeDirection) {
      this._startRun(store, history, runSpec);
    }
    this.updateGridUI(store, runSpec);
  }

  // result of clicking the button to start or stop the run
  toggleRun(button, store, history, runSpec) {
    if (!store.timeDirection) {
      this._startRun(store, history, runSpec, button);
    } else {
      this.stopRunning(store, button);
    }
  }

  _startRun(store, history, runSpec, button) {
    if (!!button) button.textContent = "Pause";
    let speed = runSpec.speed;
    if (speed < 0) {
      store.timeDirection = -1;
      speed *= -1;
    } else if (speed > 0) {
      store.timeDirection = 1;
    }
    this.runInterval = setInterval(() => {
      if (store.timeDirection === 0) {
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
      this.updateGridUI(store, runSpec);
      runSpec.toRecolor = false;
    }, 1000 / speed);
  }

  // step repeatedly progressing state
  stopRunning(store, button) {
    store.timeDirection = 0;
    if (!!button) button.textContent = "Run";
    clearInterval(this.runInterval);
  }

  // view cell details upon selecting it
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
    colorsInput.value = this.logic.toHumanReadableStr(
      this.lastSelected.program
    );
  }

  // close the menu for viewing cell details
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

  // make updates to some program and its cell upon clicking save on nums edit form
  editProgramWithNumsForm(state, inputVal, uiItems) {
    const isIntegerFormat = /^[,\-\d]+$/.test(inputVal);
    if (!isIntegerFormat) return;
    const intArr = inputVal.split(",").map((num) => parseInt(num));
    const validValues = intArr.every(
      (i) => !isNaN(i) && i !== null && i !== undefined
    );
    if (!validValues) return;
    this._submitProgram(intArr, state.grid, uiItems);
  }

  // make updates to some program and its cell upon clicking save on colors edit form
  editProgramWithColorsForm(state, inputVal, uiItems) {
    const textNoWhitespace = inputVal.replace(/\s+/g, "");
    const isHrBfFormat = /^[a-zA-Z0-9{}\-\+\<\>\.,\[\]%&]+$/.test(
      textNoWhitespace
    );
    if (!isHrBfFormat) return;
    const intArr = this.logic.fromHumanReadableStr(textNoWhitespace);
    this._submitProgram(intArr, state.grid, uiItems);
  }

  _submitProgram(program, grid, uiItems) {
    const typicalProgramLength = grid[0][0].length;
    program = program.slice(0, typicalProgramLength);
    while (program.length < typicalProgramLength) program.push(0);
    this.lastSelected.program = program;
    this._showSelectedCellDetails(this.lastSelected.pos, program);
    const { x, y } = this.lastSelected.pos;
    grid[x][y] = program;
    this.exitCellEditMode();
    this.lastSelected.cell.update(program, this.logic);
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

  // grab the configuration for making changes
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

  _getSeed() {
    const seedInput = document.getElementById("seed")[0].value;
    if (seedInput === "") {
      return Math.floor(Math.random() * 4294967296) >>> 0;
    } else if (!isNaN(parseInt(seedInput))) {
      return parseInt(seedInput);
    } else {
      return hashStringToInt(seedInput) * 4294967296;
    }
  }

  // get configuration for initializing a new grid
  getInitSpec() {
    const inputtedWidth = document.getElementById("bf-w")[0].value;
    const width = parseInt(inputtedWidth) || 20;
    const inputtedHeight = document.getElementById("bf-h")[0].value;
    const height = parseInt(inputtedHeight) || 20;
    const inputtedProgramLength = document.getElementById("cell-size").value;
    const programLength = parseInt(inputtedProgramLength) || 64;
    const seed = this._getSeed();
    return { width, height, programLength, seed };
  }

  // currently unused function for assigning certain programs on the grid
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
    });
    return grid;
  }

  // handle all effects that result from clicking on the screen
  onMouseDown(event, grid, uiItems) {
    const { renderer, camera, scene, cells } = uiItems;
    const mouse = this._getMouse(event, renderer);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
      const intersect = intersects[intersects.length - 1];
      const object = intersect.object;
      if (object.userData.isCircle) return;
      const { x, y } = this._getClickedPos(intersect, grid);
      const program = grid[x][y];
      const cell = cells[x * grid[x].length + y];
      this._clickGrid({ x, y }, program, cell, uiItems);
    } else {
      this.deSelectCell();
      this.reRender(uiItems);
    }
  }

  _getMouse(event, renderer) {
    const { screenSize } = this.miscSettings;
    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / screenSize) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / screenSize) * 2 + 1;
    return mouse;
  }

  _getClickedPos(intersect, grid) {
    const { cellPxlSize, cellPaddingPxl } = miscSettings;
    const point = intersect.point;
    const localPoint = intersect.object.worldToLocal(point);
    const ply = cellPxlSize + cellPaddingPxl;
    const boardPoint = {
      x: localPoint.x + (ply * grid.length) / 2 + ply / 2,
      y: localPoint.y + (ply * grid[0].length) / 2 + ply / 2,
    };
    const x = Math.floor(boardPoint.x / ply);
    const y = Math.floor(boardPoint.y / ply);
    return { x, y };
  }

  // handle zooming of the screen
  zoom(event, uiItems) {
    const { zoomSpeed } = this.miscSettings;
    const { renderer, camera } = uiItems;
    const rect = renderer.domElement.getBoundingClientRect();
    if (this._mouseOutOfBounds(rect, event)) return;
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    event.preventDefault();
    const mouseNDCX = ((mouseX - rect.left) / rect.width) * 2 - 1;
    const mouseNDCY = -((mouseY - rect.top) / rect.height) * 2 + 1;
    const mouseVector = new THREE.Vector3(mouseNDCX, mouseNDCY, 0);
    mouseVector.unproject(camera);
    const zoomFactor = 1 + event.deltaY * zoomSpeed;
    const newZoom = camera.zoom / zoomFactor;
    if (newZoom <= 0.01 || newZoom > 200) return;
    const scale = 1 - newZoom / camera.zoom;
    camera.position.x -= (mouseVector.x - camera.position.x) * scale;
    camera.position.y -= (mouseVector.y - camera.position.y) * scale;
    camera.zoom = newZoom;
    camera.updateProjectionMatrix();
    this.reRender(uiItems);
  }

  // handle click-to-drag of the screen
  drag(event, uiItems, prevMouse) {
    const { camera, renderer, gridDimensions } = uiItems;
    const rect = renderer.domElement.getBoundingClientRect();
    if (this._mouseOutOfBounds(rect, event)) return;

    const deltaMove = {
      x: event.clientX - prevMouse.x,
      y: event.clientY - prevMouse.y,
    };

    camera.position.x -= deltaMove.x / camera.zoom;
    camera.position.y += deltaMove.y / camera.zoom;
    this._ensureCameraInBounds(camera, gridDimensions);
    this.reRender(uiItems);
    return;
  }

  _mouseOutOfBounds(rect, event) {
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    return (
      mouseX < rect.left ||
      mouseX > rect.right ||
      mouseY < rect.top ||
      mouseY > rect.bottom
    );
  }

  _ensureCameraInBounds(camera, gridDimensions) {
    // const { cellPxlSize } = this.miscSettings;
    // const zoom = camera.zoom // * 1.1;
    // const cameraTop = (camera.top - camera.position.y) * zoom;
    // const cameraBottom = (camera.bottom - camera.position.y) * zoom;
    // const cameraLeft = (camera.left - camera.position.x) * zoom;
    // const cameraRight = (camera.right - camera.position.x) * zoom;
    // if (cameraTop < gridDimensions.bottom) {
    //   camera.position.y -= gridDimensions.bottom - cameraTop;
    // } else if (cameraBottom > gridDimensions.top) {
    //   camera.position.y -= gridDimensions.top - cameraBottom;
    // }
    // if (cameraLeft > gridDimensions.right) {
    //   camera.position.x -= gridDimensions.right - cameraLeft;
    // } else if (cameraRight < gridDimensions.left) {
    //   camera.position.x -= gridDimensions.left - cameraRight;
    // }
  }

  _clickGrid(pos, program, cell, uiItems) {
    this.exitCellEditMode();
    const prevCell = this.lastSelected.cell;
    const prevPos = this.lastSelected.pos;
    this.lastSelected = { program, cell, pos };
    this._showSelectedCellDetails(pos, program);
    const noChange = prevPos && prevPos.x == pos.x && prevPos.y == pos.y;
    if (noChange) return;
    if (prevCell) prevCell.markNotSelected();
    cell.markSelected();
    this.reRender(uiItems);
  }

  // actions that result from a cell no longer being selected
  deSelectCell() {
    this.exitCellEditMode();
    if (!!this.lastSelected.cell) {
      this.lastSelected.cell.markNotSelected();
    }
    this.lastSelected = {};
    document.getElementById("cell-details").style.display = "none";
    document.getElementById("copy-icon-validation").style.display = "none";
  }

  _showSelectedCellDetails(pos, program) {
    const posStr = `Viewing: (${pos.x}, ${pos.y})`;
    const coloredDescription = this._toColoredFormat(program);
    const intFormat = program.join(",");
    document.getElementById("copy-icon-validation").style.display = "none";
    document.getElementById("cell-details").style.display = "inline-block";
    document.getElementById("cell-details-0").innerText = posStr;
    document.getElementById("cell-details-1").innerText = intFormat;
    document.getElementById("cell-details-2").innerHTML = coloredDescription;
  }

  // snap camera to center and zoomed to view the whole grid
  reCenterCamera(uiItems, width, height) {
    const { camera } = uiItems;
    const { screenSize, cellPxlSize, cellPaddingPxl } = miscSettings;
    const ply = cellPxlSize + cellPaddingPxl;
    const ratio = screenSize / (ply * Math.max(width, height));
    camera.position.x = -ply / 2;
    camera.position.y = -ply / 2;
    camera.zoom = Math.min(ratio, 1);
    camera.updateProjectionMatrix();
    this.reRender(uiItems);
  }

  // effects of clicking the "generate" button
  generateNewBoard(store, history, runButton) {
    this.clearUI(store.uiItems);
    this.stopRunning(store, runButton);
    const initSpec = this.getInitSpec();
    store.state = this.initState(initSpec);
    history.init(miscSettings.historyFidelity, store.state);
    this.makeUiFromState(store);
  }

  // wrapper for update store with cells from createGridCells,
  // then re-render with reCenterCamera & reRender so the changes appear
  makeUiFromState(store) {
    const { uiItems, state } = store;
    const { cells, meshStore } = this.createGridCells(
      state.grid,
      uiItems.scene
    );
    uiItems.cells = cells;
    // TODO: potentially refactor so that meshStore is saved in uiItems,
    // to replace clearUI() with removeMeshesFromScene()
    this._updateCounters(state);
    const width = store.state.grid.length;
    const length = store.state.grid[0].length;
    const { cellPxlSize, cellPaddingPxl } = this.miscSettings;
    const ply = cellPxlSize + cellPaddingPxl;
    const x = ply * width / 2;
    const y = ply * length / 2;
    uiItems.gridDimensions = { top: y, bottom: -y, left: -x, right: x }
    this.reCenterCamera(store.uiItems, width, length);
  }
}

export { GridController };
