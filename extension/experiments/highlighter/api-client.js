"use strict";

// We can not call any experimental APIs in devtools page context.
// https://searchfox.org/mozilla-central/source/toolkit/components/extensions/docs/basics.rst#155-156
// Thus, introduce api-server / api-client that provides pseudo api to make experimental
// api accessible even in devtools page context.
//
// This script should run on devtools page context.

(async function install() {
  if (browser.experiments && browser.experiments.highlighter) {
    return;
  }

  if (!browser.experiments) {
    browser.experiments = {};
  }

  const port = browser.runtime.connect();

  browser.experiments.highlighter = {
    async highlight(selector) {
      this._invoke("highlight", selector);
    },

    async _invoke(method, parameter) {
      return new Promise(resolve => {
        const timestamp = Date.now();

        const listener = response => {
          if (method === response.method && timestamp === response.timestamp) {
            port.onMessage.removeListener(listener);
            resolve(response.result);
          }
        };

        port.onMessage.addListener(listener);
        port.postMessage({
          namespace: "browser.experiments.highlighter",
          method,
          parameter,
          timestamp,
        });
      });
    }
  };
})();
