"use strict";

import { UserSettings } from "./user-settings.js";
import webCompatData from "./webcompat-data.js";

const _userSettings = new UserSettings(webCompatData);

function _buildUI() {
  const browsersEl = document.getElementById("browsers");

  let currentID = null;
  let currentUlEl = null;
  for (const { id, name, version, status } of _userSettings.getDefaultBrowsers()) {
    if (currentID != id) {
      const fieldsetEl = document.createElement("fieldset");
      const legendEl = document.createElement("legend");
      legendEl.textContent = name;
      currentUlEl = document.createElement("ul");
      fieldsetEl.append(legendEl, currentUlEl);
      browsersEl.append(fieldsetEl);
      currentID = id;
    }

    const liEl = document.createElement("li");
    const inputEl = document.createElement("input");
    const labelEl = document.createElement("label");
    const elementID = _toElementID(name, version);
    inputEl.type = "checkbox";
    inputEl.id = elementID;
    inputEl.dataset.id = id;
    inputEl.dataset.name = name;
    inputEl.dataset.version = version;
    inputEl.dataset.status = status;
    labelEl.setAttribute("for", elementID);
    labelEl.textContent = `${ version } (${ status })`;
    liEl.append(inputEl, labelEl);
    currentUlEl.append(liEl);

    inputEl.addEventListener("click", _onBrowserClick);
  }

  document.getElementById("css-value-enabled")
          .addEventListener("click", _onCSSValueEnabledClick);
}

async function _onBrowserClick() {
  await _saveTargetBrowsers();
}

async function _onCSSValueEnabledClick() {
  await _saveCSSValueEnabled();
}

async function _loadOptionsData() {
  for (const { name, version } of await _userSettings.getTargetBrowsers()) {
    const elementID = _toElementID(name, version);
    const inputEl = document.getElementById(elementID);
    inputEl.checked = true;
  }

  const isCSSValueEnabled = await _userSettings.isCSSValueEnabled();
  document.getElementById("css-value-enabled").checked = isCSSValueEnabled;
}

async function _saveCSSValueEnabled() {
  const isCSSValueEnabled = document.getElementById("css-value-enabled").checked;
  await _userSettings.setCSSValueEnabled(isCSSValueEnabled);
}

async function _saveTargetBrowsers() {
  const browsers = [...document.querySelectorAll("input:checked")].map(({ dataset }) => {
    return {
      id: dataset.id,
      name: dataset.name,
      version: dataset.version,
      status: dataset.status,
    }
  });
  await _userSettings.setTargetBrowsers(browsers);
}

function _toElementID(name, version) {
  return `${name}-${version}`;
}

document.addEventListener("DOMContentLoaded", () => {
  _buildUI();
  _loadOptionsData();
});
