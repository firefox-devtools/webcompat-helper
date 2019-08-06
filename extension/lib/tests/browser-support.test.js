"use strict";

import { WebCompat } from "../webcompat";
import webCompatData from "../../webcompat-data.js";
const webcompat = new WebCompat(webCompatData);

const FIREFOX_69 = {
  id: "firefox",
  version: "69",
};

const FIREFOX_1 = {
  id: "firefox",
  version: "1",
};

const SUPER_NEW = {
  id: "supernew",
  version: "1000",
};

test("a supported browser", () => {
  const declarations = [
    {
      name: "grid-column",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("a non supported browser", () => {
  const declarations = [
    {
      name: "grid-column",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY,
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issues[0], expectedIssue);
});

test("an invalid browser without invalid browser switch", () => {
  webcompat.setInvalidBrowserEnabled(false);

  const declarations = [
    {
      name: "grid-column",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [SUPER_NEW]);
  expect(issues.length).toBe(0);
});

test("an invalid browser with invalid browser switch", () => {
  webcompat.setInvalidBrowserEnabled(true);

  const declarations = [
    {
      name: "grid-column",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [SUPER_NEW]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY,
    unsupportedBrowsers: [SUPER_NEW],
  };
  assertIssue(issues[0], expectedIssue);
});

function assertIssue(actualIssue, expectedIssue) {
  expect(actualIssue.type).toBe(expectedIssue.type);
  expect(!!actualIssue.unsupportedBrowsers).toBe(!!expectedIssue.unsupportedBrowsers);

  if (actualIssue.unsupportedBrowsers) {
    const actualUnsupportedBrowsers = actualIssue.unsupportedBrowsers;
    const expectedUnsupportedBrowsers = expectedIssue.unsupportedBrowsers;
    expect(actualUnsupportedBrowsers.length).toBe(expectedUnsupportedBrowsers.length);

    for (let i = 0; i < actualUnsupportedBrowsers.length; i++) {
      expect(actualUnsupportedBrowsers[i]).toBe(expectedUnsupportedBrowsers[i]);
    }
  }
}
