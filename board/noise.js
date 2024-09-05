import { BrainfuckLogic } from "../shared/brainfuckLogic.js"

class Noise {
  static killCells(grid, spec) {
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        if (Math.random() < spec.quantileKilled) {
          grid[x][y] = BrainfuckLogic.randomProgram();
        }
      }
    }
    return grid;
  }

  static killInstructions(grid, spec) {
    const numUpdates = grid.length * grid[0].length * 64 * spec.quantileKilled;
    for (let i = 0; i < numUpdates; i++) {
      const cellX = Math.floor(Math.random() * grid.length);
      const cellY = Math.floor(Math.random() * grid[0].length);
      const instructionIdx = Math.floor(Math.random() * 64);
      const newInstruction = Math.floor(Math.random() * 11);
      grid[cellX][cellY][instructionIdx] = newInstruction;
    }
    return grid;
  }
}

export { Noise }