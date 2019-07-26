"use strict";

// We can not call any experimental APIs in devtools page context.
// https://searchfox.org/mozilla-central/source/toolkit/components/extensions/docs/basics.rst#155-156
// Thus, introduce api-server / api-client that provides pseudo api to make experimental
// api accessible even in devtools page context.
//
// This script should run on addon parent context (as background).

browser.runtime.onConnect.addListener(port => {
  const clientId = `client-${ Date.now() }`;

  const onChange = () => {
    port.postMessage({ method: "onChange" });
  }

  const onMessage = async ({ method, timestamp }) => {
    switch (method) {
      case "onChange": {
        browser.experiments.inspectedNode.onChange.addListener(onChange, clientId);
        break;
      }
      default: {
        const result = await browser.experiments.inspectedNode[method](clientId);
        port.postMessage({ method, timestamp, result });
        break;
      }
    }
  };
  port.onMessage.addListener(onMessage);

  const onDisconnect = () => {
    browser.experiments.inspectedNode.onChange.removeListener(onChange);
    port.onDisconnect.removeListener(onDisconnect);
    port.onMessage.removeListener(onMessage);
  };
  port.onDisconnect.addListener(onDisconnect);
});
