import { BrainfuckLogic } from "../shared/brainfuckLogic.js";

class Noise {
  static killCells(grid, rng, spec) {
    const typicalProgramLength = grid[0][0].length;
    for (let x = 0; x < grid.length; x++) {
      for (let y = 0; y < grid[x].length; y++) {
        if (rng.random() < spec.quantileKilled) {
          grid[x][y] = BrainfuckLogic.randomProgram(typicalProgramLength, rng);
        }
      }
    }
    return grid;
  }

  static killInstructions(grid, rng, spec) {
    const programLengths = grid[0][0].length;
    const numUpdates =
      grid.length * grid[0].length * programLengths * spec.quantileKilled;
    for (let i = 0; i < numUpdates; i++) {
      const cellX = Math.floor(rng.random() * grid.length);
      const cellY = Math.floor(rng.random() * grid[0].length);
      const instructionIdx = Math.floor(rng.random() * programLengths);
      const newInstruction = Math.floor(rng.random() * 11);
      grid[cellX][cellY][instructionIdx] = newInstruction;
    }
    return grid;
  }
}

export { Noise };
