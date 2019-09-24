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
  const issueListEl = document.querySelector("#selected ul");
  issueListEl.innerHTML = "";

  _recursiveNodesIssuesRendering(0, [selectedNode], true, issueListEl, []).then(() => {
    if (!issueListEl.querySelector("li")) {
      _renderNoIssue(issueListEl);
    }
  });
}

async function _updateSubtree(selectedNode) {
  const subtreeEl = document.getElementById("subtree");
  const issueListEl = subtreeEl.querySelector("ul");

  subtreeEl.classList.add("processing");
  const progressEl = subtreeEl.querySelector("aside label");

  progressEl.textContent = "Getting all descendants of the selected node";
  const nodesInSubtree = await browser.experiments.inspectedNode.getNodesInSubtree();

  progressEl.textContent = "Getting web compatibility issues";
  issueListEl.innerHTML = "";
  _recursiveNodesIssuesRendering(0, nodesInSubtree, false, issueListEl, []).then(() => {
    subtreeEl.classList.remove("processing");
    if (!issueListEl.querySelector("li")) {
      _renderNoIssue(issueListEl);
    }
  });
}

/**
 * The given nodes are analysed and rendered one by one recursively.
 * Thus, the item of the result is appended to the given `listEl` sequentially.
 *
 * @param {Number} index
 *        The index of the node to be analyzed and rendered.
 * @param {Array} nodes
 *        The nodes to be analyzed and rendered. This parameter assumes the node obtained
 *        with `getNode` or `getNodesInSubtree` of `browser.experiments.inspectedNode`.
 * @param {Boolean} skipPseudo
 *        Exclude styles applied to pseudo elements of the provided node.
 * @param {Element} listEl
 *        The <ul> element the result is appended to.
 * @param {Array} groupsCache
 *        This is used inside this function only.
 */
async function _recursiveNodesIssuesRendering(index, nodes,
                                              skipPseudo, listEl, groupsCache) {
  const node = nodes[index];
  if (!node) {
    return;
  }

  if (_isValidElement(node)) {
    const { actorID, attributes, nodeName } = node;
    const htmlIssues =
      _webcompat.getHTMLElementIssues(nodeName, attributes, _targetBrowsers);
    _appendIssues(htmlIssues, node, listEl, groupsCache);

    const declarationBlocks =
      await browser.experiments.inspectedNode.getStyle(actorID, skipPseudo);
    for (const declarations of declarationBlocks) {
      const cssIssues =
        _webcompat.getCSSDeclarationBlockIssues(declarations, _targetBrowsers);
      _appendIssues(cssIssues, node, listEl, groupsCache);
    }
  }

  await _recursiveNodesIssuesRendering(index + 1, nodes, skipPseudo, listEl, groupsCache);
}

function _isValidElement({ nodeType, isCustomElement }) {
  return nodeType === Node.ELEMENT_NODE && !isCustomElement;
}

function _appendIssues(issues, node, listEl, issueGroups) {
  for (const issue of issues) {
    _appendIssue(issue, node, listEl, issueGroups);
  }
}

function _appendIssue(issue, node, listEl, issueGroups) {
  let issueGroup = issueGroups.find(i => {
    return i.type === issue.type &&
           i.property === issue.property &&
           i.element === issue.element &&
           i.attribute === issue.attribute &&
           i.value === issue.value;
  });

  if (!issueGroup) {
    issueGroup = Object.assign({}, issue, { nodes: [] });
    issueGroups.push(issueGroup);
  }

  const isNodeContainedInGroup = issueGroup.nodes.some(n => {
    return n.nodeName === node.nodeName &&
           n.nodeType === node.nodeType &&
           n.id === node.id &&
           n.className === node.className;
  });

  if (!isNodeContainedInGroup) {
    _appendOccurrence(issueGroup, node, listEl);
  }
}

function _renderNoIssue(listEl) {
  const noIssueEl = document.createElement("li");
  noIssueEl.textContent = "No issues";
  listEl.appendChild(noIssueEl);
}

function _renderIssue(issue) {
  const issueEl = document.createElement("li");
  const subjectEl = _renderSubject(issue);
  const predicateEl = _renderPredicate(issue);
  issueEl.appendChild(subjectEl);
  issueEl.appendChild(predicateEl);

  issueEl.classList.add((issue.deprecated ? "warning" : "information"));
  return issueEl;
}

function _appendOccurrence(issueGroup, occurrencedNode, issueListEl) {
  issueGroup.nodes.push(occurrencedNode);

  if (issueGroup.nodes.length === 1) {
    // Append new view for this issue.
    const issueGroupEl = _renderIssue(issueGroup);
    issueListEl.appendChild(issueGroupEl);

    // Prepare the element to show the occurrences.
    const sectionEl = document.createElement("section");
    sectionEl.classList.add("occurrences");
    const occurrencesEl = document.createElement("ul");
    issueGroupEl.append(sectionEl);
    sectionEl.append(occurrencesEl);
    issueGroup.view = sectionEl;
  } else {
    if (issueGroup.nodes.length === 2) {
      // As found multiple occurrences, change to the collapsable element.
      const listEl = issueGroup.view.querySelector("ul");
      const summaryEl = document.createElement("summary");
      const detailsEl = document.createElement("details");
      detailsEl.append(summaryEl, listEl);
      issueGroup.view.append(detailsEl);
    }

    const summaryEl = issueGroup.view.querySelector("summary");
    summaryEl.textContent = `${issueGroup.nodes.length} occurrences`;
  }

  const listEl = issueGroup.view.querySelector("ul");
  listEl.append(_renderOccurrence(occurrencedNode));
}

function _renderOccurrence({id, className, nodeName}) {
  const occurrenceEl = document.createElement("li");
  occurrenceEl.append(_renderTerm(nodeName.toLowerCase(), ["node-name"]));

  if (id) {
    occurrenceEl.append(_renderTerm(`#${ id }`, ["node-id"]));
  } else if (className.length) {
    occurrenceEl.append(
      _renderTerm(`.${ className.replace(/\s+/g, ".") }`, ["node-class"]));
  }

  occurrenceEl.addEventListener("click", _onClickNodeSelector);

  return occurrenceEl;
}

function _renderSubject(issue) {
  const { type, url } = issue;
  const subjectEl = document.createElement("span");

  switch (type) {
    case WebCompat.ISSUE_TYPE.CSS_PROPERTY: {
      subjectEl.append(
        _renderTerm(issue.property, ["property", "issue"], url)
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_PROPERTY_ALIASES: {
      subjectEl.append(
        _renderTerms(issue.aliases, ["property", "alias", "issue"], url),
        _renderTerm(` ${ issue.aliases.length === 1 ? "alias" : "aliases" }`)
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_VALUE: {
      subjectEl.append(
        _renderTerm(`${issue.property}: `),
        _renderTerm(issue.value, ["value", "issue"], url)
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_VALUE_ALIASES: {
      subjectEl.append(
        _renderTerm(`${issue.property}: `),
        _renderTerms(issue.aliases, ["value", "alias", "issue"], url),
        _renderTerm(` ${ issue.aliases.length === 1 ? "alias" : "aliases" }`)
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.HTML_ATTRIBUTE: {
      subjectEl.append(
        _renderTerm(issue.element.toLowerCase(), ["element"]),
        _renderTerm(" "),
        _renderTerm(issue.attribute.toLowerCase(), ["attribute", "issue"], url),
        _renderTerm(" attribute"),
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.HTML_ELEMENT: {
      subjectEl.append(
        _renderTerm(issue.element.toLowerCase(), ["element", "issue"], url)
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

    const auxiliaryVerb = !aliases || aliases.length === 1 ? "isn't" : "aren't";
    predicateEl.appendChild(_renderTerm(` ${ auxiliaryVerb } supported in `));
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

function _renderTerms(terms, classes, url) {
  const containerEl = document.createElement("span");

  for (const term of terms) {
    const termEl = _renderTerm(term, classes, url);
    containerEl.appendChild(termEl);
  }

  return containerEl;
}

function _renderTerm(text, classes = [], url = null) {
  const tagName = url ? "a" : "span";
  const termEl = document.createElement(tagName);
  termEl.classList.add(...classes);
  termEl.textContent = text;

  if (url) {
    termEl.href = url;
    termEl.title = url;
    termEl.addEventListener("click", _onClickLink);
  }

  return termEl;
}

function _onClickLink(e) {
  e.stopPropagation();
  e.preventDefault();
  browser.tabs.create({ url: e.target.href });
}

function _onClickNodeSelector(e) {
  e.stopPropagation();
  e.preventDefault();
  const selector = e.target.closest("li").textContent;
  browser.experiments.highlighter.highlight(selector);
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
