"use strict";

const _SUPPORT_STATE = {
  BROWSER_NOT_FOUND: "BROWSER_NOT_FOUND",
  DATA_NOT_FOUND: "DATA_NOT_FOUND",
  SUPPORTED: "SUPPORTED",
  UNSUPPORTED: "UNSUPPORTED",
};

const _ISSUE_TYPE = {
  CSS_PROPERTY: "CSS_PROPERTY",
  CSS_PROPERTY_ALIASES: "CSS_PROPERTY_ALIASES",
};

class WebCompat {
  static get SUPPORT_STATE() {
    return _SUPPORT_STATE;
  }

  static get ISSUE_TYPE() {
    return _ISSUE_TYPE;
  }

  /**
   * @param JSON of browser compat data of MDN
   *        https://github.com/mdn/browser-compat-data
   */
  constructor(webCompatData) {
    this._webCompatData = webCompatData;
    this._flattenAliases(this._webCompatData.css.properties);
  }

  /**
   * Return all browsers this can handle.
   * @return {Object}
   * @see https://github.com/mdn/browser-compat-data/tree/master/browsers
   */
  getBrowsers() {
    return this._webCompatData.browsers;
  }

  /**
   * @param {Array} declarations -
   *                e.g. [{ property: "background-color", value: "lime" }, ...]
   * @param {Array} browsers -
   *                e.g. [{ name: "firefox", brandName: "Firefox", version: "68" }, ...]
   * @return {Array} issues
   */
  getCSSDeclarationBlockIssues(declarations, browsers) {
    const database = this._webCompatData.css.properties;
    const issues = [];
    let aliasMap = null;

    for (const { name: property } of declarations) {
      if (!this._hasTerm(database, property)) {
        issues.push({ type: _ISSUE_TYPE.CSS_PROPERTY, property, invalid: true });
        continue;
      }

      const alias = this._getAlias(database, property);
      if (alias) {
        if (!aliasMap) {
          aliasMap = new Map();
        }

        if (!aliasMap.has(alias)) {
          aliasMap.set(alias, [property]);
        } else {
          aliasMap.get(alias).push(property);
        }
        continue;
      }

      const unsupportedBrowsers = browsers.filter(({ name, version }) => {
        const state = this._getSupportState(name, version, database, property);
        return state !== _SUPPORT_STATE.SUPPORTED;
      });
      const { deprecated, experimental } = this._getStatus(database, property);

      if (unsupportedBrowsers.length || deprecated || experimental) {
        issues.push({
          type: _ISSUE_TYPE.CSS_PROPERTY,
          property,
          deprecated,
          experimental,
          unsupportedBrowsers: unsupportedBrowsers.length ? unsupportedBrowsers : null,
        });
      }
    }

    if (aliasMap) {
      for (const [property, aliases] of aliasMap.entries()) {
        const unsupportedBrowsers = browsers.filter(b => {
          for (const alias of aliases) {
            const state = this._getSupportState(b.name, b.version, database, alias);
            if (state === _SUPPORT_STATE.SUPPORTED) {
              return false;
            }
          }

          return true;
        });
        const { deprecated, experimental } = this._getStatus(database, property);

        if (unsupportedBrowsers.length || deprecated || experimental) {
          issues.push({
            type: _ISSUE_TYPE.CSS_PROPERTY_ALIASES,
            aliases,
            property,
            deprecated,
            experimental,
            unsupportedBrowsers: unsupportedBrowsers.length ? unsupportedBrowsers : null,
          });
        }
      }
    }

    return issues;
  }

  _asFloatVersion(version = false) {
    if (version === true) {
      return 0;
    }
    return version === false ? Number.MAX_VALUE : parseFloat(version);
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

  /**
   * Builds a list of aliases between CSS properties, like flex and -webkit-flex,
   * and mutates individual entries in the web compat data store for CSS properties to
   * add their corresponding aliases.
   */
  _flattenAliases(compatNode) {
    for (let term in compatNode) {
      const compatTable = this._getCompatTable(compatNode, [term]);
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
  }

  _getAlias(compatNode, ...terms) {
    const targetNode = this._getCompatNode(compatNode, terms);
    return targetNode ? targetNode._aliasOf : null;
  }

  _getChildCompatNode(compatNode, term) {
    term = term.toLowerCase();

    let child = compatNode[term];
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

  _getSupportState(browser, version, compatNode, ...terms) {
    const compatTable = this._getCompatTable(compatNode, terms);
    if (!compatTable) {
      return _SUPPORT_STATE.DATA_NOT_FOUND;
    }

    let supportList = compatTable.support[browser];
    if (!supportList) {
      return _SUPPORT_STATE.BROWSER_NOT_FOUND;
    }

    supportList = Array.isArray(supportList) ? supportList : [supportList];
    version = parseFloat(version);
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

  _hasTerm(compatNode, ...terms) {
    return !!this._getCompatTable(compatNode, terms);
  }
}

export { WebCompat };
