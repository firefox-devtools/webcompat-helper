"use strict";

// We can not call any browser.tabs APIs in devtools page context.
// Thus, introduce api-server / api-client that provides pseudo api to make the api
// accessible even in devtools page context.
//
// This script should run on addon parent context (as background).

browser.runtime.onConnect.addListener(port => {
  const onMessage = async ({ namespace, method, option }) => {
    if (namespace !== "browser.tabs") {
      return;
    }

    switch (method) {
      case "create": {
        browser.tabs.create(option);
        break;
      }
    }
  };
  port.onMessage.addListener(onMessage);

  const onDisconnect = () => {
    port.onDisconnect.removeListener(onDisconnect);
    port.onMessage.removeListener(onMessage);
  };
  port.onDisconnect.addListener(onDisconnect);
});
