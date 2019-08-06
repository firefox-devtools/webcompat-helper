"use strict";

import { UserSettings } from "./user-settings.js";
import { WebCompat } from "./lib/webcompat.js";
import _webCompatData from "./webcompat-data.js";

const _webcompat = new WebCompat(_webCompatData);
const _userSettings = new UserSettings(_webCompatData);
let _targetBrowsers = null;

async function _update() {
  const selectedNode = await browser.experiments.inspectedNode.getNode();
  _updateSelectedNode(selectedNode);
  _updateSubtree(selectedNode);
}

async function _updateSelectedNode(selectedNode) {
  const ulEl = document.querySelector("#selected ul");

  if (!_isValidElement(selectedNode)) {
    _render([], ulEl);
    return;
  }

  const issues = [];

  const { attributes, nodeName } = selectedNode;
  issues.push(
    ..._webcompat.getHTMLElementIssues(nodeName, attributes, _targetBrowsers));

  const declarationBlocks = await browser.experiments.inspectedNode.getStyle();
  for (const { declarations } of declarationBlocks) {
    issues.push(
      ..._webcompat.getCSSDeclarationBlockIssues(declarations, _targetBrowsers));
  }

  _render(issues, ulEl);
}

async function _updateSubtree(selectedNode) {
  const ulEl = document.querySelector("#subtree ul");

  if (!_isValidElement(selectedNode)) {
    _render([], ulEl);
    return;
  }

  const issues = [];

  for (const node of await browser.experiments.inspectedNode.getNodesInSubtree()) {
    if (!_isValidElement(node)) {
      continue
    }

    const { attributes, nodeName } = node;
    issues.push(
      ..._webcompat.getHTMLElementIssues(nodeName, attributes, _targetBrowsers));
  }

  const declarationBlocks = await browser.experiments.inspectedNode.getStylesInSubtree();
  for (const { declarations } of declarationBlocks) {
    issues.push(
      ..._webcompat.getCSSDeclarationBlockIssues(declarations, _targetBrowsers));
  }

  _render(issues, ulEl);
}

function _isValidElement({ nodeType, isCustomElement }) {
  return nodeType === Node.ELEMENT_NODE && !isCustomElement;
}

function _render(issues, ulEl) {
  ulEl.innerHTML = "";

  if (!issues.length) {
    const liEl = document.createElement("li");
    liEl.textContent = "No issues";
    ulEl.appendChild(liEl);
  } else {
    for (const issue of issues) {
      ulEl.appendChild(_renderIssue(issue));
    }
  }
}

function _renderIssue(issue) {
  const liEl = document.createElement("li");
  const subjectEl = _renderSubject(issue);
  const predicateEl = _renderPredicate(issue);
  liEl.appendChild(subjectEl);
  liEl.appendChild(predicateEl);

  liEl.classList.add((issue.deprecated ? "warning" : "information"));

  return liEl;
}

function _renderSubject(issue) {
  const { type } = issue;
  const subjectEl = document.createElement("span");

  switch (type) {
    case WebCompat.ISSUE_TYPE.CSS_PROPERTY: {
      subjectEl.append(
        _renderTerm(issue.property, ["property", "issue"])
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_PROPERTY_ALIASES: {
      subjectEl.append(
        _renderTerms(issue.aliases, ["property", "alias", "issue"]),
        _renderTerm(` ${ issue.aliases.length === 1 ? "alias" : "aliases" }`)
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_VALUE: {
      subjectEl.append(
        _renderTerm(`${issue.property}: `),
        _renderTerm(issue.value, ["value", "issue"])
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_VALUE_ALIASES: {
      subjectEl.append(
        _renderTerm(`${issue.property}: `),
        _renderTerms(issue.aliases, ["value", "alias", "issue"]),
        _renderTerm(` ${ issue.aliases.length === 1 ? "alias" : "aliases" }`)
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.HTML_ATTRIBUTE: {
      subjectEl.append(
        _renderTerm(issue.element.toLowerCase(), ["element"]),
        _renderTerm(" "),
        _renderTerm(issue.attribute.toLowerCase(), ["attribute", "issue"]),
        _renderTerm(" attribute"),
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.HTML_ELEMENT: {
      subjectEl.append(
        _renderTerm(issue.element.toLowerCase(), ["element", "issue"])
      );
      break;
    }
  }

  return subjectEl;
}

function _renderPredicate(issue) {
  const { type, aliases, unsupportedBrowsers } = issue;
  const predicateEl = document.createElement("span");

  const warningEl = _renderWarning(issue);
  if (warningEl) {
    predicateEl.appendChild(warningEl);
  }

  if (unsupportedBrowsers.length) {
    if (warningEl) {
      predicateEl.appendChild(_renderTerm(" and "));
    }

    const auxiliaryVerb = !aliases || aliases.length === 1 ? "does" : "do";
    predicateEl.appendChild(_renderTerm(` ${ auxiliaryVerb } not support`));
    predicateEl.appendChild(_renderBrowsersElement(unsupportedBrowsers));
  }

  predicateEl.appendChild(_renderTerm("."));
  return predicateEl;
}

function _renderWarning(issue) {
  const { type, aliases, deprecated, experimental } = issue;

  if (!deprecated && !experimental) {
    return null;
  }

  const warningEl = document.createElement("span");

  const connection = !aliases || aliases.length === 1 ? " is " : " are ";
  warningEl.appendChild(_renderTerm(connection));

  if (deprecated) {
    const deprecatedEl = _renderTerm("deprecated");
    deprecatedEl.classList.add("deprecated");
    warningEl.appendChild(deprecatedEl);
  }

  if (experimental) {
    const experimentalEl = _renderTerm("experimental");
    experimentalEl.classList.add("experimental");

    if (deprecated) {
      warningEl.appendChild(_renderTerm(" and "));
    }

    warningEl.appendChild(experimentalEl);
  }

  return warningEl;
}

function _renderBrowsersElement(browsers) {
  const browsersEl = document.createElement("span");

  const map = {};
  for (const { id, name, status } of browsers) {
    if (!map[id]) {
      map[id] = { name, versions: [] };
    }
    map[id].versions.push(status);
  }

  for (let id in map) {
    const { name, versions } = map[id];
    const browserEl = _renderTerm(name);
    browserEl.classList.add("browser");
    browserEl.classList.add(id);

    const versionsEl = document.createElement("span");
    versionsEl.classList.add("versions");

    for (const version of versions) {
      const versionEl = _renderTerm(version);
      versionEl.classList.add("version");
      versionsEl.appendChild(versionEl);
    }

    browserEl.appendChild(versionsEl);
    browsersEl.appendChild(browserEl);
  }

  return browsersEl;
}

function _renderTerms(terms, classes) {
  const containerEl = document.createElement("span");

  for (const term of terms) {
    const termEl = _renderTerm(term, classes);
    containerEl.appendChild(termEl);
  }

  return containerEl;
}

function _renderTerm(text, classes = []) {
  const termEl = document.createElement("span");
  termEl.classList.add(...classes);
  termEl.textContent = text;
  return termEl;
}

async function _updateCSSValueEnabled() {
  const isCSSValueEnabled = await _userSettings.isCSSValueEnabled();
  _webcompat.setCSSValueEnabled(isCSSValueEnabled);
}

async function _updateTargetBrowsers() {
  _targetBrowsers = await _userSettings.getTargetBrowsers();
}

browser.experiments.inspectedNode.onChange.addListener(_update);

_userSettings.addChangeListener(UserSettings.SETTING_TYPE.TARGET_BROWSER, async () => {
  await _updateTargetBrowsers();
  await _update();
});

_userSettings.addChangeListener(UserSettings.SETTING_TYPE.CSS_VALUE_ENABLED, async () => {
  await _updateCSSValueEnabled();
  await _update();
});

(async function initialize() {
  await _updateCSSValueEnabled();
  await _updateTargetBrowsers();
  await _update();
})();
