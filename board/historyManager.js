class HistoryManager {
  init(fidelity, initialState) {
    this.fidelity = fidelity;
    this.initialState = {
      ...initialState,
      grid: this.deepCopy(initialState.grid),
    };
    this.history = [];
    return this;
  }

  deepCopy(grid) {
    const deepCopy = [];
    grid.forEach((row) => {
      const newRow = row.map((cell) => {
        return [...cell];
      });
      deepCopy.push(newRow);
    });
    return deepCopy;
  }

  addState(state) {
    if (state.epoch % this.fidelity != 0) return;
    const historyIsAhead =
      this.history.length > 0 &&
      this.history[this.history.length - 1].epoch > state.epoch;
    if (historyIsAhead) return;
    this.history.push(state);
  }

  // private
  getStoredState(epoch) {
    let pointer = this.history.length - 1;
    if (this.history.length == 0) return this.initialState;
    while (pointer >= 0 && this.history[pointer].epoch > epoch) {
      pointer--;
    }
    return pointer < 0 ? this.initialState : this.history[pointer];
  }

  getState(epoch, getNextStateFunc) {
    let state = this.getStoredState(epoch);
    while (state.epoch < epoch) {
      state = getNextStateFunc(state);
      this.history.push(state);
    }
    return state;
  }
}

export { HistoryManager }