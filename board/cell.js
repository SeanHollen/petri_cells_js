import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import miscSettings from "../miscSettings.js";

class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  createMesh(program, gridWidth, gridHeight, scene, logic) {
    const rowLen = Math.floor(Math.sqrt(program.length));
    const cellSize = miscSettings.cellPxlSize;
    const padding = miscSettings.cellPaddingPxl;
    // const padding = 0;
    const geometry = new THREE.PlaneGeometry(
      cellSize,
      cellSize,
      rowLen,
      rowLen
    );
    const xPoint = this.x * (cellSize + padding) - (gridWidth * cellSize) / 2;
    const yPoint = this.y * (cellSize + padding) - (gridHeight * cellSize) / 2;
    this._setPositionsBuffer(geometry, cellSize, program);
    this._setColorsBuffer(geometry, program, logic);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(xPoint, yPoint, 0);
    mesh.userData.gridPosition = { x: this.x, y: this.y };
    this.mesh = mesh;
    scene.add(this.mesh);
  }

  _setPositionsBuffer(geometry, cellSize, program) {
    const vertices = [];
    const indices = [];
    const sqrt = Math.floor(Math.sqrt(program.length));
    const tileSize = cellSize / sqrt;
    let index = 0;
    for (let y = 0; y < sqrt; y++) {
      for (let x = 0; x < sqrt; x++) {
        const xPoint = (tileSize * x) - (cellSize / 2);
        // const yPoint = (tileSize * y) - (cellSize / 2);
        const yPoint = ((sqrt - 1 - y) * tileSize) - (cellSize / 2);
        // 1 vertex for each of 4 corners
        const squareVertices = [
          xPoint, yPoint, 0,
          (xPoint + tileSize), yPoint, 0, 
          (xPoint + tileSize), (yPoint + tileSize), 0,
          xPoint, (yPoint + tileSize), 0,
        ];
        vertices.push(...squareVertices);
        indices.push(index, index + 1, index + 2);
        indices.push(index, index + 2, index + 3);
        index += 4;
      }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(
      vertices, 3
    ));
    geometry.setIndex(indices);
  }

  _setColorsBuffer(geometry, program, logic) {
    const tileColors = [];
    const sqrt = Math.floor(Math.sqrt(program.length));
    for (let x = 0; x < sqrt; x++) {
      for (let y = 0; y < sqrt; y++) {
        const instruction = program[x * sqrt + y];
        const color = this._threeColor(instruction, logic);
        for (let i = 0; i < 4; i++) {
          const rgb = [color.r, color.g, color.b];
          tileColors.push(...rgb);
        }
      }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(
      tileColors, 3
    ));
    this.prevProgram = program;
  }

  updateMesh(program, logic) {
    const colors = this.mesh.geometry.attributes.color;
    for (let i = 0; i < program.length; i++) {
      const instruction = program[i];
      if (this.prevProgram && this.prevProgram[i] == instruction) continue;
      const color = this._threeColor(instruction, logic);
      for (let x = 0; x < 4; x++) {
        const idx = i * 4 + x;
        colors.setXYZ(idx, color.r, color.g, color.b);
      }
    }
    colors.needsUpdate = true;
    this.prevProgram = program;
  }

  _threeColor(instruction, logic) {
    const colorStr = logic.intToColor(instruction);
    return new THREE.Color(colorStr);
  }

  removeCell(scene) {
    scene.remove(this.mesh);
  }

  markSelected() {

  }

  markNotSelected() {

  }
}

export { Cell };
