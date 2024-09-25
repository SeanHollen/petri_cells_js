import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";
import { BrainfuckLogic } from "../shared/brainfuckLogic.js";
import { getLanguageMapping } from "../shared/readLanguageMapping.js";
import { Noise } from "./noise.js";
import { Mulberry32, hashStringToInt } from "./rng.js";
import { Cell } from "./cell.js";
import miscSettings from "../miscSettings.js";

class GridController {
  constructor() {
    this.lastSelected = {};
    const languageMapping = getLanguageMapping();
    this.logic = new BrainfuckLogic(languageMapping);
    this.miscSettings = miscSettings;
  }

  initState({ width, height, programLength, seed }) {
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
    };
  }

  updateState(state, runSpec) {
    const { range, noiseAction, pctNoise, bfLogic } = runSpec;
    this.logic = bfLogic;
    let grid = state.grid;
    const rng = state.rng;
    const height = grid.length;
    const width = grid[0].length;
    const outRange = 2 * range + 1;
    const seen = new Array(width * height).fill(false);

    const tuples = [...this.tuples].sort(() => rng.random() - 0.5);
    const selected = this.lastSelected.pos;
    tuples.forEach((tuple) => {
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
    delete this.lastSelected.lastReactedWith;
    const newState = history.get(state.epoch - 1);
    return newState;
  }

  clear(uiItems) {
    const { cells } = uiItems;
    this.deSelectCell();
    cells.forEach((cell) => {
      cell.removeCell();
    });
  }

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

  updateGridUI({ state, uiItems }, toRecolor) {
    const { epoch, uniqueCells, grid } = state;
    const { scene, cells } = uiItems;
    this._updateCounters(epoch, uniqueCells);
    if (!cells || toRecolor) {
      uiItems.cells = this.createGridCells(grid, scene);
    } else {
      this._updateGridCells(grid, cells);
      this._markReactedWith(grid, cells);
    }
    this.reRender(uiItems);
  }

  reRender(uiItems) {
    const { renderer, scene, camera } = uiItems;
    renderer.render(scene, camera);
  }

  _updateCounters(epoch, uniqueCells) {
    document.getElementById("step-counter").textContent = `Epoch: ${epoch}`;
    document.getElementById(
      "unique-cells"
    ).textContent = `Unique Cells: ${uniqueCells}`;
  }

  createGridCells(grid, scene) {
    const cells = [];
    const gridMesh = this._createMesh(grid);
    scene.add(gridMesh);
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const cell = new Cell(x, y, grid.length, grid[x].length, scene);
        cells.push(cell);
      }
    }
    const typicalProgramLen = grid[0][0].length;
    cells.forEach((cell, i) => {
      cell.setMeshProperties(gridMesh, 4 * i * typicalProgramLen);
    });
    return cells;
  }

  _createMesh(grid) {
    const { cellPxlSize, cellPaddingPxl } = miscSettings;
    const ply = cellPxlSize + cellPaddingPxl;
    const width = grid.length * ply;
    const height = grid[0].length * ply;
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    const geometry = new THREE.PlaneGeometry(width, height);
    const gridMesh = new THREE.Mesh(geometry, material);
    gridMesh.position.set(0, 0, 0);
    this._setPositionsBuffer(geometry, grid);
    this._setColorsBuffer(geometry, grid);
    return gridMesh;
  }

  _setPositionsBuffer(geometry, grid) {
    const vertices = [];
    const indices = [];
    const { cellPxlSize, cellPaddingPxl } = miscSettings;
    const ply = cellPxlSize + cellPaddingPxl;
    const subX = (grid.length * ply) / 2;
    const subY = (grid[0].length * ply) / 2;
    let index = 0;
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[0].length; y++) {
        const cellX = x * ply - subX;
        const cellY = y * ply - subY;
        const program = grid[x][y];
        const out = this._cellPositionsBuffer(cellX, cellY, program, index);
        vertices.push(...out.cellVertices);
        indices.push(...out.cellIndices);
        index += out.cellVertices.length / 3;
      }
    }
    const buffer = new THREE.Float32BufferAttribute(vertices, 3);
    geometry.setAttribute("position", buffer);
    geometry.setIndex(indices);
  }

  _cellPositionsBuffer(cellCenterX, cellCenterY, program, indexStart) {
    const cellVertices = [];
    const cellIndices = [];
    const { cellPxlSize } = miscSettings;
    const sqrt = Math.floor(Math.sqrt(program.length));
    const tileSize = cellPxlSize / sqrt;
    let index = indexStart;
    const sub = cellPxlSize / 2;
    for (let y = 0; y < sqrt; y++) {
      for (let x = 0; x < sqrt; x++) {
        const xPoint = tileSize * x - sub;
        const yPoint = tileSize * (sqrt - 1 - y) - sub;
        const x1 = cellCenterX + xPoint;
        const x2 = cellCenterX + xPoint + tileSize;
        const y1 = cellCenterY + yPoint;
        const y2 = cellCenterY + yPoint + tileSize;
        cellVertices.push(x1, y1, 0);
        cellVertices.push(x2, y1, 0);
        cellVertices.push(x2, y2, 0);
        cellVertices.push(x1, y2, 0);
        cellIndices.push(index, index + 1, index + 2);
        cellIndices.push(index, index + 2, index + 3);
        index += 4;
      }
    }
    return { cellVertices, cellIndices };
  }

  _setColorsBuffer(geometry, grid) {
    const colorsBuffer = [];
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[0].length; y++) {
        const program = grid[x][y];
        const cellColors = this._cellColorsBuffer(program);
        colorsBuffer.push(...cellColors);
      }
    }
    const buffer = new THREE.Float32BufferAttribute(colorsBuffer, 3);
    geometry.setAttribute("color", buffer);
  }

  _cellColorsBuffer(program) {
    const colors = [];
    const sqrt = Math.floor(Math.sqrt(program.length));
    for (let x = 0; x < sqrt; x++) {
      for (let y = 0; y < sqrt; y++) {
        const instruction = program[x * sqrt + y];
        const colorStr = this.logic.intToColor(instruction);
        const color = new THREE.Color(colorStr);
        for (let i = 0; i < 4; i++) {
          const rgb = [color.r, color.g, color.b];
          colors.push(...rgb);
        }
      }
    }
    return colors;
  }

  _updateGridCells(grid, cells) {
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        const program = grid[x][y];
        const i = x * grid[x].length + y;
        const cell = cells[i];
        cell.updateMesh(program, this.logic);
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

  save(store, history, runSpec) {
    const timeDirection = store.timeDirection;
    this.stopRunning(store);
    history.addState(store.state);
    if (timeDirection) {
      this._startRun(store, history, runSpec);
    }
  }

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
      this.updateGridUI(store, runSpec.toRecolor);
      runSpec.toRecolor = false;
    }, 1000 / speed);
  }

  stopRunning(store, button) {
    store.timeDirection = 0;
    if (!!button) button.textContent = "Run";
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
    colorsInput.value = this.logic.toHumanReadableStr(
      this.lastSelected.program
    );
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
    this._submitProgram(intArr, state.grid, uiItems);
  }

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

  drag(event, uiItems, prevMouse) {
    const { camera, renderer } = uiItems;
    const rect = renderer.domElement.getBoundingClientRect();
    if (this._mouseOutOfBounds(rect, event)) return;

    const deltaMove = {
      x: event.clientX - prevMouse.x,
      y: event.clientY - prevMouse.y,
    };

    camera.position.x -= deltaMove.x / camera.zoom;
    camera.position.y += deltaMove.y / camera.zoom;
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

  reCenterCamera(uiItems, width, height) {
    const { camera } = uiItems;
    const { screenSize, cellPxlSize, cellPaddingPxl } = miscSettings;
    const ply = cellPxlSize + cellPaddingPxl;
    const ratio = screenSize / (ply * Math.max(width, height));
    camera.position.x = -ply / 2;
    camera.position.y = -ply / 2;
    camera.zoom = ratio;
    camera.updateProjectionMatrix();
    this.reRender(uiItems);
  }

  generateNewBoard(store, history, runButton) {
    this.clear(store.uiItems);
    const initSpec = this.getInitSpec();
    store.state = this.initState(initSpec);
    history.init(miscSettings.historyFidelity, store.state);
    this.createGridCells(store.state.grid, store.uiItems.scene);
    this.stopRunning(store, runButton);
    const width = store.state.grid.length;
    const length = store.state.grid[0].length;
    this.reCenterCamera(store.uiItems, width, length);
    this.reRender(store.uiItems);
  }
}

export { GridController };
