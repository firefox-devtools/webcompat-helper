"use strict";

(async function install() {
  const pane = await browser.devtools.panels.elements.createSidebarPane("Compatibility");
  pane.setPage("sidebar-pane.html");
})();
