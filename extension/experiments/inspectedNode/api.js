"use strict";

this.inspectedNode = class extends ExtensionAPI {
  getAPI(context) {
    const { Services } = Cu.import("resource://gre/modules/Services.jsm");
    const { require } = Cu.import("resource://devtools/shared/Loader.jsm");
    const { gDevTools } = require("devtools/client/framework/devtools");

    const _clients = new Map();

    const _observe = async (fireForEvent, clientId) => {
      await _setupClientIfNeeded(clientId);
      const client = _clients.get(clientId);

      const onNodeChange = () => {
        fireForEvent.asyncWithoutClone({});
      };
      client.onNodeChange = onNodeChange;

      const { inspector } = client;
      const changesFront = await inspector.target.getFront("changes");
      // We call `allChanges()` to activate emiting all events from the actor now.
      // When the Bug 1563757 fixes, we can remove.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1563757
      changesFront.allChanges();
      changesFront.on("clear-changes", onNodeChange);
      changesFront.on("remove-change", onNodeChange);
      changesFront.on("add-change", onNodeChange);
      inspector.selection.on("new-node-front", onNodeChange);
    };

    const _unobserve = async (clientId) => {
      const { inspector, onNodeChange } = _clients.get(clientId);
      // During the DevTools close, the references to the target and fronts may become
      // invalidated before dependencies have a chance to unregister. This guard is here
      // to prevent throwing errors as a result of trying to work on an unavailable front.
      try {
        const changesFront = await inspector.target.getFront("changes");
        changesFront.off("clear-changes", onNodeChange);
        changesFront.off("remove-change", onNodeChange);
        changesFront.off("add-change", onNodeChange);
        inspector.selection.off("new-node-front", onNodeChange);
      } catch (err) {
        // silent error
      }

      _clients.delete(clientId);
    };

    const _getStyle = async (clientId) => {
      await _setupClientIfNeeded(clientId);

      const { inspector } = _clients.get(clientId);

      const node = inspector.selection.nodeFront;
      const styles =
        await inspector.pageStyle.getApplied(node, { skipPseudo: true });

      return styles.map(({ rule }) => {
        const { actorID: ruleId } = rule;
        let { declarations } = rule;
        declarations = declarations.filter(d => !d.commentOffsets);
        return declarations.length ? { ruleId, declarations } : null;
      }).filter(rule => !!rule);
    };

    const _setupClientIfNeeded = async (clientId) => {
      if (_clients.has(clientId)) {
        return;
      }

      const navigator = Services.wm.getMostRecentWindow("navigator:browser");
      const tab = navigator.gBrowser.selectedTab;
      const target = await gDevTools.getTargetForTab(tab);
      const toolbox = gDevTools.getToolbox(target);
      const inspector = toolbox.getPanel("inspector");
      _clients.set(clientId, { inspector });
    }

    return {
      experiments: {
        inspectedNode: {
          async getStyle(clientId) {
            return _getStyle(clientId);
          },

          onChange: new ExtensionCommon.EventManager({
            context,
            name: "experiments.inspectedNode.onChange",
            register: (fire, clientId) => {
              _observe(fire, clientId);

              return () => {
                _unobserve(clientId);
              };
            },
          }).api()
        },
      },
    };
  }
}
