"use strict";

class ProgressBar {
  constructor(parentEl, labelEl, progressEl) {
    this._labelEl = labelEl;
    this._parentEl = parentEl;
    this._progressEl = progressEl;
  }

  setText(value) {
    this._labelEl.textContent = value;
  }

  setMax(value) {
    this._progressEl.max = value;
  }

  setValue(value) {
    this._progressEl.value = value;
  }

  incremental(value) {
    this._progressEl.value += value;
  }

  enable() {
    this._parentEl.classList.add("processing");
  }

  disable() {
    this._parentEl.classList.remove("processing");
  }
}

export { ProgressBar };
