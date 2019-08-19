"use strict";

// We can not call any browser.tabs APIs in devtools page context.
// Thus, introduce api-server / api-client that provides pseudo api to make the api
// accessible even in devtools page context.
//
// This script should run on devtools page context.

(async function install() {
  if (browser.tabs) {
    return;
  }

  const port = browser.runtime.connect();

  browser.tabs = {
    async create(option) {
      port.postMessage({
        namespace: "browser.tabs",
        method: "create",
        option,
      });
    },
  };
})();
