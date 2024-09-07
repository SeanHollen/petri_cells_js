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

  noteState(state) {
    if (state.epoch % this.fidelity != 0) return;
    const historyIsAhead =
      this.history.length > 0 &&
      this.history[this.history.length - 1].epoch > state.epoch;
    if (historyIsAhead) return;
    this.history.push(state);
  }

  addState(state) {
    state = this.deepCopy(state);
    const historyIsAhead =
      this.history.length > 0 &&
      this.history[this.history.length - 1].epoch > state.epoch;
    if (historyIsAhead) return;
    this.history.push(state);
  }


  get(epoch) {
    let pointer = this.history.length - 1;
    if (this.history.length == 0) return this.deepCopy(this.initialState);
    // todo: replace this with a binary search
    while (pointer >= 0 && this.history[pointer].epoch > epoch) pointer--;
    const res = pointer < 0 ? this.initialState : this.history[pointer];
    return this.deepCopy(res);
  }
}

export { HistoryManager }