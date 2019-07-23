"use strict";

import { UserSettings } from "./user-settings.js";
import webCompatData from "./webcompat-data.js";

const _userSettings = new UserSettings(webCompatData);

function _buildUI() {
  const mainEl = document.querySelector("main");

  let currentID = null;
  let currentUlEl = null;
  for (const { id, name, version, status } of _userSettings.getDefaultBrowsers()) {
    if (currentID != id) {
      const fieldsetEl = document.createElement("fieldset");
      const legendEl = document.createElement("legend");
      legendEl.textContent = name;
      currentUlEl = document.createElement("ul");
      fieldsetEl.append(legendEl, currentUlEl);
      mainEl.append(fieldsetEl);
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

    inputEl.addEventListener("click", _onInputClick);
  }
}

async function _loadOptionsData() {
  for (const { name, version } of await _userSettings.getTargetBrowsers()) {
    const elementID = _toElementID(name, version);
    const inputEl = document.getElementById(elementID);
    inputEl.checked = true;
  }
}

async function _onInputClick() {
  await _saveOptionsData();
}

async function _saveOptionsData() {
  const browsers = [...document.querySelectorAll("input:checked")].map(({ dataset }) => {
    return {
      id: dataset.id,
      name: dataset.name,
      version: dataset.version,
      status: dataset.status,
    }
  });
  await _userSettings.saveTargetBrowsers(browsers);
}

function _toElementID(name, version) {
  return `${name}-${version}`;
}

document.addEventListener("DOMContentLoaded", () => {
  _buildUI();
  _loadOptionsData();
});
