"use strict";

this.highlighter = class extends ExtensionAPI {
  getAPI(context) {
    const { Services } = Cu.import("resource://gre/modules/Services.jsm");
    const { require } = Cu.import("resource://devtools/shared/Loader.jsm");
    const { gDevTools } = require("devtools/client/framework/devtools");

    async function _highlight(selector) {
      const navigator = Services.wm.getMostRecentWindow("navigator:browser");
      const tab = navigator.gBrowser.selectedTab;
      const target = await gDevTools.getTargetForTab(tab);
      const toolbox = gDevTools.getToolbox(target);
      const inspector = toolbox.getPanel("inspector");
      inspector.searchBox.value = selector;
      inspector.search.doFullTextSearch(selector, false);
    }

    return {
      experiments: {
        highlighter: {
          async highlight(selector) {
            await _highlight(selector);
          }
        },
      },
    };
  }
}
