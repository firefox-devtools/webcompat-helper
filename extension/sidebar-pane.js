"use strict";

import { WebCompat } from "./lib/webcompat.js";
import _webCompatData from "./webcompat-data.js";
const _webcompat = new WebCompat(_webCompatData);
const _targetBrowsers = _getTargetBrowsers();

async function _update() {
  const issues = [];
  const declarationBlocks = await browser.experiments.inspectedNode.getStyle();

  for (const { declarations } of declarationBlocks) {
    issues.push(
      ..._webcompat.getCSSDeclarationBlockIssues(declarations, _targetBrowsers));
  }

  _render(issues);
}

function _render(issues) {
  const sectionEl = document.querySelector("section");
  sectionEl.innerHTML = "";

  const ulEl = document.createElement("ul");
  if (!issues.length) {
    const liEl = document.createElement("li");
    liEl.textContent = "No issues";
    ulEl.appendChild(liEl);
  } else {
    for (const issue of issues) {
      ulEl.appendChild(_renderIssue(issue));
    }
  }
  sectionEl.appendChild(ulEl);
}

function _renderIssue(issue) {
  const liEl = document.createElement("li");
  const subjectEl = _renderSubject(issue);
  const predicateEl = _renderPredicate(issue);
  liEl.appendChild(subjectEl);
  liEl.appendChild(predicateEl);

  liEl.classList.add((issue.invalid || issue.deprecated ? "warning" : "information"));

  return liEl;
}

function _renderSubject(issue) {
  const { type } = issue;
  const subjectEl = document.createElement("span");

  switch (type) {
    case WebCompat.ISSUE_TYPE.CSS_PROPERTY: {
      subjectEl.append(
        _renderTerm(issue.property, ["property"])
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_PROPERTY_ALIASES: {
      subjectEl.append(
        _renderTerms(issue.aliases, ["property", "alias"]),
        _renderTerm(` ${ issue.aliases.length === 1 ? "alias" : "aliases" }`)
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_VALUE: {
      subjectEl.append(
        _renderTerm(`${issue.property}: `),
        _renderTerm(issue.value, ["value"])
      );
      break;
    }
    case WebCompat.ISSUE_TYPE.CSS_VALUE_ALIASES: {
      subjectEl.append(
        _renderTerm(`${issue.property}: `),
        _renderTerms(issue.aliases, ["value", "alias"]),
        _renderTerm(` ${ issue.aliases.length === 1 ? "alias" : "aliases" }`)
      );
      break;
    }
  }

  return subjectEl;
}

function _renderPredicate(issue) {
  const { type, invalid, aliases, unsupportedBrowsers } = issue;
  const predicateEl = document.createElement("span");

  if (invalid) {
    predicateEl.appendChild(_renderTerm(" is invalid."));
    return predicateEl;
  }

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
  for (const { brandName, name, version } of browsers) {
    if (!map[name]) {
      map[name] = { brandName, versions: [] };
    }
    map[name].versions.push(version);
  }

  for (let name in map) {
    const { brandName, versions } = map[name];
    const browserEl = _renderTerm(brandName);
    browserEl.classList.add("browser");
    browserEl.classList.add(name);

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

function _getTargetBrowsers() {
  const stauses = ["esr", "current", "beta", "nightly"];
  const browsers = _webcompat.getBrowsers();
  const targets = [];
  for (const name of ["firefox", "firefox_android",
                      "chrome", "chrome_android",
                      "safari", "safari_ios",
                      "edge", "edge_mobile"]) {
    const { name: brandName, releases } = browsers[name];

    for (const version in releases) {
      const { status } = releases[version];

      if (stauses.includes(status)) {
        targets.push({ name, brandName, version, status });
      }
    }
  }

  return targets;
}

browser.experiments.inspectedNode.onChange.addListener(_update);
_update();
