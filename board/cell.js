import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";
import miscSettings from "../miscSettings.js";

class Cell {
  constructor(x, y, gridWidth, gridHeight, scene) {
    this.x = x;
    this.y = y;
    const cellSize = miscSettings.cellPxlSize;
    const padding = miscSettings.cellPaddingPxl;
    this.xPoint = this.x * (cellSize + padding) - (gridWidth * (cellSize + padding)) / 2;
    this.yPoint = this.y * (cellSize + padding) - (gridHeight * (cellSize + padding)) / 2;
    this.scene = scene
  }

  createMesh(program, logic) {
    const rowLen = Math.floor(Math.sqrt(program.length));
    const { cellPxlSize } = miscSettings;
    const geometry = new THREE.PlaneGeometry(
      cellPxlSize,
      cellPxlSize,
      rowLen,
      rowLen
    );
    this._setPositionsBuffer(geometry, cellPxlSize, program);
    this._setColorsBuffer(geometry, program, logic);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(this.xPoint, this.yPoint, 0);
    mesh.userData.gridPosition = { x: this.x, y: this.y };
    this.mesh = mesh;
    this.scene.add(this.mesh);
  }

  _setPositionsBuffer(geometry, cellSize, program) {
    const vertices = [];
    const indices = [];
    const sqrt = Math.floor(Math.sqrt(program.length));
    const tileSize = cellSize / sqrt;
    let index = 0;
    for (let y = 0; y < sqrt; y++) {
      for (let x = 0; x < sqrt; x++) {
        const xPoint = tileSize * x - cellSize / 2;
        // const yPoint = (tileSize * y) - (cellSize / 2);
        const yPoint = (sqrt - 1 - y) * tileSize - cellSize / 2;
        // 1 vertex for each of 4 corners
        const squareVertices = [
          xPoint,
          yPoint,
          0,
          xPoint + tileSize,
          yPoint,
          0,
          xPoint + tileSize,
          yPoint + tileSize,
          0,
          xPoint,
          yPoint + tileSize,
          0,
        ];
        vertices.push(...squareVertices);
        indices.push(index, index + 1, index + 2);
        indices.push(index, index + 2, index + 3);
        index += 4;
      }
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
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
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(tileColors, 3)
    );
    this.prevProgram = program;
  }

  updateMesh(program, logic) {
    this._removeArrow();
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

  removeCell() {
    this.markNotSelected();
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }

  markSelected() {
    const black = 0x000000;
    const white = 0xffffff;
    this.marker = this._createCircle(7, 0.2, white);
    this.border = this._createCircle(8, 0.1, black);
    this.scene.add(this.marker);
    this.scene.add(this.border);
  }

  markReactedWith(reactedWithCell, order) {
    const thisPos = new THREE.Vector3(this.xPoint, this.yPoint, 0.1);
    const otherPos = new THREE.Vector3(reactedWithCell.xPoint, reactedWithCell.yPoint, 0.1);
    if (order === 0) {
      this.arrow = this._createArrow(thisPos, otherPos);
    } else if (order === 1) {
      this.arrow = this._createArrow(otherPos, thisPos);
    }
    if (!this.arrow) return;
    this.scene.add(this.arrow);
  }

  _createArrow(startPos, endPos) {
    startPos.z = 0.3;
    endPos.z = 0.3;
    const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
    const arrowLength = startPos.distanceTo(endPos);
    const blackColor = 0x000000;
    const arrowHeadLen = 15;
    const arrowHeadWidth = 15;
    const arrow = new THREE.ArrowHelper(
      direction,
      startPos,
      arrowLength,
      blackColor,
      arrowHeadLen,
      arrowHeadWidth
    );
    return arrow;
  }

  _createCircle(r, z, color) {
    const radius = r;
    const circleGeometry = new THREE.CircleGeometry(radius, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: color,
      side: THREE.DoubleSide,
    });
    const circle = new THREE.Mesh(circleGeometry, material);
    circle.position.set(this.xPoint, this.yPoint, z);
    circle.userData.isCircle = true;
    return circle;
  }

  markNotSelected() {
    if (!!this.marker) {
      this._removeCircle(this.marker);
      delete this.marker;
    }
    if (!!this.border) {
      this._removeCircle(this.border);
      delete this.border;
    }
    this._removeArrow();
  }

  _removeCircle(asset) {
    this.scene.remove(asset);
    asset.geometry.dispose();
    asset.material.dispose();
  }

  _removeArrow() {
    if (!!this.arrow) {
      this.scene.remove(this.arrow);
      this.arrow.dispose();
      delete this.arrow;
    }
  }
}

export { Cell };
