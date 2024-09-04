class EventHandleHelper {
  constructor(buttonMapping, stepAction, backAction) {
    this.buttonMapping = buttonMapping;
    this.stepAction = stepAction;
    this.backAction = backAction;
  }

  addEventListener(id, action, preventDefaults) {
    // I want to use mousedown rather than click, because it's more snappy
    // but mousedown doesn't cover spacebar and enter-key presses
    // and if I register them both, then it causes both to trigger
    // so I check e.screenX to register whether it was an actual click,
    // and differentiate between mouse clicks and button clicks that way.
    document.getElementById(id).addEventListener("mousedown", (e) => {
      if (preventDefaults) {
        e.preventDefault();
      }
      if (e.screenX) {
        action();
      }
    });
    document.getElementById(id).addEventListener("keydown", (e) => {
      if (this.stepAction && e.key === "ArrowRight") {
        document.getElementById(this.buttonMapping.stepButton).focus();
        this.stepAction();
      } else if (this.backAction && e.key === "ArrowLeft") {
        document.getElementById(this.buttonMapping.backButton).focus();
        this.backAction();
      } else {
        if (preventDefaults) {
          e.preventDefault();
        }
        if (!e.screenX) {
          action();
        }
      }
    });
  }
}

export { EventHandleHelper }