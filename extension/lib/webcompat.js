"use strict";

import { CSSValueParser } from "./css-value-parser.js";

const _SUPPORT_STATE = {
  BROWSER_NOT_FOUND: "BROWSER_NOT_FOUND",
  DATA_NOT_FOUND: "DATA_NOT_FOUND",
  SUPPORTED: "SUPPORTED",
  UNSUPPORTED: "UNSUPPORTED",
};

const _ISSUE_TYPE = {
  CSS_PROPERTY: "CSS_PROPERTY",
  CSS_PROPERTY_ALIASES: "CSS_PROPERTY_ALIASES",
  CSS_VALUE: "CSS_VALUE",
  CSS_VALUE_ALIASES: "CSS_VALUE_ALIASES",
  HTML_ELEMENT: "HTML_ELEMENT",
};

// The follwing data will not be necessary if this issue is fixed.
// https://github.com/mdn/browser-compat-data/issues/4309
const _CSS_VALUE_TYPES = {
  "background-image": ["global_keywords", "image", "url"],
  "padding": ["global_keywords", "length", "percentage", "calc"],
};

// MDN Compat data looks not having the data which are supporting all browser.
// Thus, we define the units of above.
const _WHITE_TYPE_MAP = {
  length: ["em", "px", "cm", "mm", "in", "pc", "pt"],
};


class WebCompat {
  static get ISSUE_TYPE() {
    return _ISSUE_TYPE;
  }

  /**
   * @param JSON of browser compat data of MDN
   *        https://github.com/mdn/browser-compat-data
   */
  constructor(webCompatData) {
    this._webCompatData = webCompatData;
    this._cssValueParser = new CSSValueParser();

    // Flatten all CSS properties node.
    this._flattenAliases(this._webCompatData.css.properties);

    // Flatten all CSS types node.
    this._flattenAliases(this._webCompatData.css.types);

    this._css_value_enabled = false;
  }

  setCSSValueEnabled(isEnabled) {
    this._css_value_enabled = isEnabled;
  }

  /**
   * @param {Array} declarations -
   *                e.g. [{ property: "background-color", value: "lime" }, ...]
   * @param {Array} browsers -
   *                e.g. [{ id: "firefox", name: "Firefox", version: "68" }, ...]
   * @return {Array} issues
   */
  getCSSDeclarationBlockIssues(declarations, browsers) {
    let summaries = [];
    for (const { name: property, value } of declarations) {
      summaries.push(this._getCSSPropertyCompatSummary(browsers, property));

      if (this._css_value_enabled) {
        summaries.push(...this._getCSSValueCompatSummaries(browsers, property, value));
      }
    }

    // Classify aliases issue and normal issue.
    const { aliasSummaries, normalSummaries } =
      this._classifyCSSSummariesByAliasAndNormal(browsers, summaries);

    // Finally, convert to CSS issues.
    return this._toCSSIssues(normalSummaries.concat(aliasSummaries));
  }

  /**
   * @param {String} elementName -
   *                e.g. div, main, aside
   * @param {Array} browsers -
   *                e.g. [{ id: "firefox", name: "Firefox", version: "68" }, ...]
   * @return {Object} if no issue found, return null.
   */
  getHTMLElementIssue(elementName, browsers) {
    const database = this._webCompatData.html.elements;
    const summary = this._getCompatSummary(browsers, database, elementName);

    if (!this._hasIssue(summary)) {
      return null;
    }

    summary.element = elementName;
    return this._toIssue(summary, _ISSUE_TYPE.HTML_ELEMENT);
  }

  _asFloatVersion(version = false) {
    if (version === true) {
      return 0;
    }
    return version === false ? Number.MAX_VALUE : parseFloat(version);
  }

  _classifyCSSSummariesByAliasAndNormal(browsers, summaries) {
    // Classify aliases issue and normal issue.
    const aliasSummariesMap = new Map();
    const normalSummaries = summaries.filter(s => {
      const { database, invalid, property, terms, unsupportedBrowsers, value } = s;

      if (invalid) {
        return true;
      }

      const alias = this._getAlias(database, ...terms);
      if (!alias) {
        return true;
      }

      if (!aliasSummariesMap.has(alias)) {
        aliasSummariesMap.set(alias, Object.assign(s, {
          property: value ? property : alias,
          value: value ? alias : undefined,
          aliases: [],
          unsupportedBrowsers: browsers
        }));
      }

      // Update alias summary.
      const terminal = terms.pop();
      const aliasSummary = aliasSummariesMap.get(alias);
      if (!aliasSummary.aliases.includes(terminal)) {
        aliasSummary.aliases.push(terminal);
      }
      aliasSummary.unsupportedBrowsers =
        aliasSummary.unsupportedBrowsers.filter(b => unsupportedBrowsers.includes(b));
      return false;
    });

    return { aliasSummaries: [...aliasSummariesMap.values()], normalSummaries }
  }

  _findAliasesFrom(compatTable) {
    const aliases = [];

    for (let browser in compatTable.support) {
      let supportStates = compatTable.support[browser] || [];
      supportStates = Array.isArray(supportStates) ? supportStates : [supportStates]

      for (const { alternative_name, prefix } of supportStates) {
        if (!prefix && !alternative_name) {
          continue;
        }

        aliases.push({ alternative_name, prefix });
      }
    }

    return aliases;
  }

  _findTermPath(parent, term) {
    for (let field in parent) {
      if (field.startsWith("_")) {
        continue;
      }

      const child = parent[field];
      if (field === term) {
        return [term];
      }

      const path = this._findTermPath(child, term);
      if (path) {
        path.unshift(field);
        return path;
      }
    }

    return null;
  }

  /**
   * Builds a list of aliases between CSS properties, like flex and -webkit-flex,
   * and mutates individual entries in the web compat data store for CSS properties to
   * add their corresponding aliases.
   */
  _flattenAliases(compatNode) {
    for (let term in compatNode) {
      if (term.startsWith("_")) {
        // Ignore exploring if the term is _aliasOf or __compat.
        continue;
      }

      const compatTable = this._getCompatTable(compatNode, [term]);
      if (compatTable) {
        const aliases = this._findAliasesFrom(compatTable);

        for (const { alternative_name, prefix } of aliases) {
          const alias = alternative_name || prefix + term;
          compatNode[alias] = { _aliasOf: term };
        }

        if (aliases.length) {
          // Make the term accessible as the alias.
          compatNode[term]._aliasOf = term;
        }
      }

      // Flatten deeper node as well.
      this._flattenAliases(compatNode[term]);
    }
  }

  _getAlias(compatNode, ...terms) {
    const targetNode = this._getCompatNode(compatNode, terms);
    return targetNode ? targetNode._aliasOf : null;
  }

  _getChildCompatNode(compatNode, term) {
    term = term.toLowerCase();

    let child = null;
    for (let field in compatNode) {
      if (field.toLowerCase() === term) {
        child = compatNode[field];
        break;
      }
    }

    if (!child) {
      return null;
    }

    if (child._aliasOf) {
      // If the node is an alias, returns the node the alias points.
      child = compatNode[child._aliasOf]
    }

    return child;
  }

  /**
   * Return a compatibility node which is target for `terms` parameter from `compatNode`
   * parameter. For example, when check `background-clip:  content-box;`, the `terms` will
   * be ["background-clip", "content-box"]. Then, follow the name of terms from the
   * compatNode node, return the target node. Although this function actually do more
   * complex a bit, if it says simply, returns a node of
   * compatNode["background-clip"]["content-box""] .
   */
  _getCompatNode(compatNode, terms) {
    for (const term of terms) {
      compatNode = this._getChildCompatNode(compatNode, term);
      if (!compatNode) {
        return null;
      }
    }

    return compatNode;
  }

  _getCompatTable(compatNode, terms) {
    let targetNode = this._getCompatNode(compatNode, terms);

    if (!targetNode) {
      return null;
    }

    if (!targetNode.__compat) {
      for (let field in targetNode) {
        // TODO: We don't have a way to know the context for now.
        // Thus, try to find a compat table from first context node.
        // e.g. flex_context of align-item
        // https://github.com/mdn/browser-compat-data/blob/master/css/properties/align-items.json#L5
        if (field.endsWith("_context")) {
          targetNode = targetNode[field];
          break;
        }
      }
    }

    return targetNode.__compat;
  }

  _getCompatSummary(browsers, database, ...terms) {
    if (!this._hasTerm(database, ...terms)) {
      return { invalid: true, unsupportedBrowsers: [] };
    }

    const unsupportedBrowsers = browsers.filter(browser => {
      const state = this._getSupportState(browser, database, ...terms);
      return state !== _SUPPORT_STATE.SUPPORTED;
    });
    const { deprecated, experimental } = this._getStatus(database, ...terms);

    return {
      database,
      terms,
      deprecated,
      experimental,
      unsupportedBrowsers,
    };
  }

  _getCSSPropertyCompatSummary(browsers, property) {
    const database = this._webCompatData.css.properties;
    const summary = this._getCompatSummary(browsers, database, property);
    return Object.assign(summary, { property });
  }

  _getCSSValueCompatSummaries(browsers, property, value) {
    if (!this._hasTerm(this._webCompatData.css.properties, property)) {
      // Since the property is invalid, we don't have to do anymore.
      return [];
    }

    const summaries = [];

    for (const token of this._cssValueParser.parse(value)) {
      // TODO: Find issue from inside of "function" as well.

      let term = null;
      let type = null;
      switch (token.type) {
        case "function":
        case "ident": {
          term = token.value;
          type = token.value;
          break;
        }
        case "dimension": {
          term = token.value + token.unit;
          type = token.unit;
          break;
        }
        case "percentage": {
          term = (token.value * 100) + "%";
          type = token.type;
          break;
        }
        case "url":
        case "string":
        case "number": {
          term = token.value;
          type = token.type;
          break;
        }
        default: {
          continue;
        }
      }

      // 1st. Find from white list.
      if (this._isCSSValueInWhiteList(property, term, type)) {
        continue;
      }

      // 2nd. Find from CSS properties node.
      const database = this._webCompatData.css;
      let path = this._getTermPath(database, "properties", property, type);

      if (!path.length && _CSS_VALUE_TYPES[property]) {
        // 3rd. As there was no corresponding data in properties database,
        //      try to find issues from CSS types data.
        for (const dataType of _CSS_VALUE_TYPES[property]) {
          if (dataType === type) {
            path = ["types", dataType];
            break;
          }

          path = this._getTermPath(database, "types", dataType, type);
          if (path.length) {
            break;
          }
        }
      }

      const summary = this._getCompatSummary(browsers, database, ...path);
      summaries.push(Object.assign(summary, { property, value: term }));
    }

    return summaries;
  }

  _getTermPath(database, ...terms) {
    const terminal = terms.pop();
    const compatNode = this._getCompatNode(database, terms);
    if (!compatNode) {
      return [];
    }
    const relativePath = this._findTermPath(compatNode, terminal);
    return relativePath ? terms.concat(relativePath) : [];
  }

  _getSupportState(browser, compatNode, ...terms) {
    const compatTable = this._getCompatTable(compatNode, terms);
    if (!compatTable) {
      return _SUPPORT_STATE.DATA_NOT_FOUND;
    }

    let supportList = compatTable.support[browser.id];
    if (!supportList) {
      return _SUPPORT_STATE.BROWSER_NOT_FOUND;
    }

    supportList = Array.isArray(supportList) ? supportList : [supportList];
    const version = parseFloat(browser.version);
    const terminal = terms[terms.length - 1];
    const match = terminal.match(/^-\w+-/);
    const prefix = match ? match[0] : null;

    for (const support of supportList) {
      if((!support.prefix && !prefix) || support.prefix === prefix) {
        const addedVersion = this._asFloatVersion(support.version_added);
        const removedVersion = this._asFloatVersion(support.version_removed);

        if (addedVersion <= version && version < removedVersion) {
          return _SUPPORT_STATE.SUPPORTED;
        }
      }
    }

    return _SUPPORT_STATE.UNSUPPORTED;
  }

  _getStatus(compatNode, ...terms) {
    const compatTable = this._getCompatTable(compatNode, terms);
    return compatTable ? compatTable.status : {};
  }

  _hasIssue({ unsupportedBrowsers, deprecated, experimental, invalid }) {
    return unsupportedBrowsers.length || deprecated || experimental || invalid;
  }

  _hasTerm(compatNode, ...terms) {
    return !!this._getCompatTable(compatNode, terms);
  }

  _isCSSValueInWhiteList(property, term, type) {
    const dataTypes = _CSS_VALUE_TYPES[property] || [];

    return dataTypes.find(dataType => {
      if (dataType === "length") {
        // <length> special case.
        if (type === "number" && term === 0) {
          return true;
        }
      }

      const whiteTypes = _WHITE_TYPE_MAP[dataType];
      return whiteTypes ? whiteTypes.includes(type) : false;
    });
  }

  _toIssue(summary, type) {
    return Object.assign({}, summary, { type, database: undefined, terms: undefined });
  }

  _toCSSIssues(summaries) {
    const issues = [];

    for (const summary of summaries) {
      if (!this._hasIssue(summary)) {
        continue;
      }

      let type = null;
      if (summary.aliases) {
        type = typeof summary.value !== "undefined"
                 ? _ISSUE_TYPE.CSS_VALUE_ALIASES
                 : _ISSUE_TYPE.CSS_PROPERTY_ALIASES;
      } else {
        type = typeof summary.value !== "undefined"
                 ? _ISSUE_TYPE.CSS_VALUE
                 : _ISSUE_TYPE.CSS_PROPERTY;
      }

      issues.push(this._toIssue(summary, type));
    }

    return issues;
  }
}

export { WebCompat };
