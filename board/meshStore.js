import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js";

class MeshStore {
  constructor() {
    this.id = Math.round(Math.random() * 10 ** 4);
    this.meshes = [];
    this.maxIndicesPerMesh = 30_000_000;
    this.indicesPerTile = 6;
  }

  initMeshes(numCells, typicalProgramLen) {
    this.typicalProgramLen = typicalProgramLen;
    const indiciesPerCell = this.typicalProgramLen * this.indicesPerTile;
    this.cellsPerMesh = Math.floor(this.maxIndicesPerMesh / indiciesPerCell);
    const requiredMeshes = Math.ceil(numCells / this.cellsPerMesh);
    this.indiciesPerMesh = this.cellsPerMesh * indiciesPerCell;
    for (let i = 0; i < requiredMeshes; i++) {
      const mesh = this._initMesh(i);
      this.meshes.push(mesh);
    }
  }

  _initMesh(i) {
    const material = new THREE.MeshBasicMaterial({ vertexColors: true });
    const geometry = new THREE.PlaneGeometry();
    const gridMesh = new THREE.Mesh(geometry, material);
    gridMesh.userData = { meshStore: this.id, i: i };
    gridMesh.position.set(0, 0, 0);
    return gridMesh;
  }

  propsForNthCell(n) {
    const meshN = n % this.cellsPerMesh;
    const i = (n - meshN) / this.cellsPerMesh;
    const mesh = this.meshes[i];
    const writeIndex = meshN * this.typicalProgramLen * 4;
    return { mesh, writeIndex };
  }

  partitionCells(cells) {
    const paritions = [];
    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];
      const cellGroup = cells.slice(
        i * this.cellsPerMesh,
        (i + 1) * this.cellsPerMesh
      );
      paritions.push({ mesh, cellGroup });
    }
    return paritions;
  }

  addMeshesToScene(scene) {
    this.meshes.forEach((mesh) => {
      scene.add(mesh);
    });
  }

  removeMeshesFromScene(scene) {
    this.meshes.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }
}

export { MeshStore };
