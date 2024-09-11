class HistoryManager {
  init(fidelity, initialState) {
    this.fidelity = fidelity;
    this.initialState = this.deepCopy(initialState);
    this.history = [];
    return this;
  }

  deepGridCopy(grid) {
    return grid.map((row) => {
      return row.map((cell) => {
        return [...cell];
      });
    });
  }

  deepCopy(state) {
    return {
      ...state,
      grid: this.deepGridCopy(state.grid),
      rng: state.rng.getCopy(),
    };
  }

  lastStoredEpochPriorTo(epoch) {
    // todo: replace this with a binary search
    let pointer = this.history.length - 1;
    while (pointer >= 0 && this.history[pointer].epoch > epoch) pointer--;
    return pointer;
  }

  noteState(state) {
    if (state.epoch % this.fidelity != 0) return;
    this.addState(state);
  }

  addState(state) {
    state = this.deepCopy(state);
    const pointer = this.lastStoredEpochPriorTo(state.epoch) + 1;
    this.history.splice(pointer, 0, state);
  }

  get(epoch) {
    if (this.history.length == 0) return this.deepCopy(this.initialState);
    const pointer = this.lastStoredEpochPriorTo(epoch);
    const res = pointer < 0 ? this.initialState : this.history[pointer];
    return this.deepCopy(res);
  }
}

export { HistoryManager }