"use strict";

// We can not call any experimental APIs in devtools page context.
// https://searchfox.org/mozilla-central/source/toolkit/components/extensions/docs/basics.rst#155-156
// Thus, introduce api-server / api-client that provides pseudo api to make experimental
// api accessible even in devtools page context.
//
// This script should run on addon parent context (as background).

browser.runtime.onConnect.addListener(port => {
  const onMessage = async ({ namespace, method, parameter, timestamp }) => {
    if (namespace !== "browser.experiments.highlighter") {
      return;
    }

    const result = await browser.experiments.highlighter[method](parameter);
    port.postMessage({ method, timestamp, result });
  };
  port.onMessage.addListener(onMessage);

  const onDisconnect = () => {
    browser.experiments.inspectedNode.onChange.removeListener(onChange);
    port.onDisconnect.removeListener(onDisconnect);
    port.onMessage.removeListener(onMessage);
  };
  port.onDisconnect.addListener(onDisconnect);
});
