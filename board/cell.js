import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";
import miscSettings from "../miscSettings.js";

class Cell {
  constructor(x, y, gridWidth, gridHeight, scene) {
    this.x = x;
    this.y = y;
    const { cellPxlSize, cellPaddingPxl } = miscSettings;
    const ply = cellPxlSize + cellPaddingPxl;
    const subX = gridWidth * ply / 2;
    const subY = gridHeight * ply / 2;
    this.xPoint = this.x * ply - subX;
    this.yPoint = this.y * ply - subY;
    this.scene = scene
  }

  setMeshProperties(gridMesh, colorIdxStart) {
    this.gridMesh = gridMesh;
    this.colorIdxStart = colorIdxStart;
  }

  updateMesh(program, logic) {
    this._removeArrow();
    const colors = this.gridMesh.geometry.attributes.color;
    program.forEach((instruction, i) => {
      const noChange = this.prevProgram && this.prevProgram[i] == instruction;
      if (noChange) return;
      const colorStr = logic.intToColor(instruction);
      const color = new THREE.Color(colorStr);
      const colorIdx = this.colorIdxStart + (i * 4);
      for (let x = 0; x < 4; x++) {
        colors.setXYZ(colorIdx + x, color.r, color.g, color.b);
      }
    });
    colors.needsUpdate = true;
    this.prevProgram = program;
  }

  removeCell() {
    this.markNotSelected();
    this.scene.remove(this.gridMesh);
    this.gridMesh.geometry.dispose();
    this.gridMesh.material.dispose();
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
