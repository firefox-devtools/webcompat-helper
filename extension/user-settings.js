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

class UserSettings {
  constructor(webCompatData) {
    this._webCompatData = webCompatData;
    this._onChange = this._onChange.bind(this);
    browser.storage.onChanged.addListener(this._onChange);
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

  addChangeListener(listener) {
    if (!this._listeners) {
      this._listeners = [listener];
    } else {
      this._listeners.push(listener);
    }
  }

  _onChange(changes, area) {
    if (!this._listeners || area !== "local" || !changes.browsers) {
      return;
    }

    for (const listener of this._listeners) {
      listener();
    }
  }
}

export { UserSettings };
