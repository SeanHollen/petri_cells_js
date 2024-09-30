import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";
import miscSettings from "../miscSettings.js";

class Cell {
  constructor(x, y, gridWidth, gridHeight, scene, program) {
    this.cellPxlSize = miscSettings.cellPxlSize;
    const cellPaddingPxl = miscSettings.cellPaddingPxl;
    const ply = this.cellPxlSize + cellPaddingPxl;
    const subX = (gridWidth * ply) / 2;
    const subY = (gridHeight * ply) / 2;
    this.cellPointX = x * ply - subX;
    this.cellPointY = y * ply - subY;
    this.scene = scene;
    this.program = program;
  }

  setMeshProperties(gridMesh, colorIdxStart) {
    this.gridMesh = gridMesh;
    this.colorIdxStart = colorIdxStart;
  }

  cellPositionsBuffer(idxPointer) {
    const program = this.program;
    const cellVerticies = [];
    const cellIndices = [];
    const sqrt = Math.floor(Math.sqrt(program.length));
    const tileSize = this.cellPxlSize / sqrt;
    const sub = this.cellPxlSize / 2;
    for (let y = 0; y < sqrt; y++) {
      for (let x = 0; x < sqrt; x++) {
        const xPoint = tileSize * x - sub;
        const yPoint = tileSize * (sqrt - 1 - y) - sub;
        const x1 = this.cellPointX + xPoint;
        const x2 = this.cellPointX + xPoint + tileSize;
        const y1 = this.cellPointY + yPoint;
        const y2 = this.cellPointY + yPoint + tileSize;
        cellVerticies.push(x1, y1, 0);
        cellVerticies.push(x2, y1, 0);
        cellVerticies.push(x2, y2, 0);
        cellVerticies.push(x1, y2, 0);
        cellIndices.push(idxPointer, idxPointer + 1, idxPointer + 2);
        cellIndices.push(idxPointer, idxPointer + 2, idxPointer + 3);
        idxPointer += 4;
      }
    }
    return { cellVerticies, cellIndices };
  }

  cellColorsBuffer(logic) {
    const colors = [];
    this.program.forEach((instruction) => {
      const colorStr = logic.intToColor(instruction);
      const color = new THREE.Color(colorStr);
      for (let i = 0; i < 4; i++) {
        const rgb = [color.r, color.g, color.b];
        colors.push(...rgb);
      }
    });
    return colors;
  }

  update(program, logic, toRecolor) {
    this._removeArrow();
    const colors = this.gridMesh.geometry.attributes.color;
    program.forEach((instruction, i) => {
      const noChange = this.program && this.program[i] == instruction;
      if (noChange && !toRecolor) return;
      const colorStr = logic.intToColor(instruction);
      const color = new THREE.Color(colorStr);
      const colorIdx = this.colorIdxStart + i * 4;
      for (let x = 0; x < 4; x++) {
        colors.setXYZ(colorIdx + x, color.r, color.g, color.b);
      }
    });
    colors.needsUpdate = true;
    this.program = program;
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
    const thisPos = new THREE.Vector3(this.cellPointX, this.cellPointY, 0.1);
    const otherPos = new THREE.Vector3(
      reactedWithCell.cellPointX,
      reactedWithCell.cellPointY,
      0.1
    );
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
    const direction = new THREE.Vector3()
      .subVectors(endPos, startPos)
      .normalize();
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
    circle.position.set(this.cellPointX, this.cellPointY, z);
    circle.userData.isCircle = true;
    return circle;
  }

  markNotSelected() {
    this._removeCircle("marker");
    this._removeCircle("border");
    this._removeArrow();
  }

  _removeCircle(assetName) {
    const asset = this[assetName];
    if (!!asset) {
      this.scene.remove(asset);
      asset.geometry.dispose();
      asset.material.dispose();
      delete this[assetName];
    }
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
