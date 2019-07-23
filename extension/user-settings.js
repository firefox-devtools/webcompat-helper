"use strict";

const TARGET_BROWSER_NAMES = [
  "firefox", "firefox_android",
  "chrome", "chrome_android",
  "safari", "safari_ios",
  "edge", "edge_mobile",
];

const TARGET_BROWSER_STATUSES = [
  "esr", "current", "beta", "nightly"
]

const _SETTING_TYPE = {
  TARGET_BROWSER: "TARGET_BROWSER",
  CSS_VALUE_ENABLED: "CSS_VALUE_ENABLED",
};

class UserSettings {
  static get SETTING_TYPE() {
    return _SETTING_TYPE;
  }

  constructor(webCompatData) {
    this._webCompatData = webCompatData;
    this._onChange = this._onChange.bind(this);
    browser.storage.onChanged.addListener(this._onChange);
  }

  addChangeListener(type, listener) {
    if (!this._listenersMap) {
      this._listenersMap = new Map();
    }

    if (this._listenersMap.has(type)) {
      this._listenersMap.get(type).push(listener);
    } else {
      this._listenersMap.set(type, [listener]);
    }
  }

  getDefaultBrowsers() {
    const browsers = this._webCompatData.browsers;
    const targets = [];
    for (const id of TARGET_BROWSER_NAMES) {
      const { name, releases } = browsers[id];

      for (const version in releases) {
        const { status } = releases[version];

        if (TARGET_BROWSER_STATUSES.includes(status)) {
          targets.push({ id, name, version, status });
        }
      }
    }

    return targets;
  }

  async getTargetBrowsers() {
    const { browsers } = await browser.storage.local.get("browsers");
    return browsers || this.getDefaultBrowsers();
  }

  async isCSSValueEnabled() {
    const { isCSSValueEnabled } = await browser.storage.local.get("isCSSValueEnabled");
    return !!isCSSValueEnabled;
  }

  async setCSSValueEnabled(isCSSValueEnabled) {
    await browser.storage.local.set({ isCSSValueEnabled });
  }

  async setTargetBrowsers(browsers) {
    await browser.storage.local.set({ browsers });
  }

  _onChange(changes, area) {
    if (!this._listenersMap || area !== "local") {
      return;
    }

    const type = changes.browsers ? _SETTING_TYPE.TARGET_BROWSER
                                  : _SETTING_TYPE.CSS_VALUE_ENABLED;

    if (!this._listenersMap.has(type)) {
      return;
    }

    for (const listener of this._listenersMap.get(type)) {
      listener();
    }
  }
}

export { UserSettings };
