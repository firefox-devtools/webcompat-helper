"use strict";

import { WebCompat } from "../webcompat";
import webCompatData from "../../webcompat-data";
const webcompat = new WebCompat(webCompatData);
webcompat.setCSSValueEnabled(true);

const FIREFOX_69 = {
  id: "firefox",
  version: "69",
};

const FIREFOX_1 = {
  id: "firefox",
  version: "1",
};

const FIREFOX_4 = {
  id: "firefox",
  version: "4",
};

test("a supported css value", () => {
  const declarations = [
    {
      name: "display",
      value: "inline-table",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("a non supported css value", () => {
  const declarations = [
    {
      name: "display",
      value: "inline-table",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_VALUE,
    property: "display",
    value: "inline-table",
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issues[0], expectedIssue);
});

test("an experimental css value", () => {
  const declarations = [
    {
      name: "display",
      value: "flow-root",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_VALUE,
    experimental: true,
    property: "display",
    value: "flow-root",
    unsupportedBrowsers: [],
  };
  assertIssue(issues[0], expectedIssue);
});

test("an deprecated css value", () => {
  const declarations = [
    {
      name: "display",
      value: "subgrid",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_VALUE,
    deprecated: true,
    property: "display",
    value: "subgrid",
    unsupportedBrowsers: [FIREFOX_69],
  };
  assertIssue(issues[0], expectedIssue);
});

test("mapped css types", () => {
  const declarations = [
    {
      name: "padding",
      value: "1rem",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_VALUE,
    property: "padding",
    value: "1rem",
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issues[0], expectedIssue);
});

test("invalid value", () => {
  const declarations = [
    {
      name: "padding",
      value: "invalid-value",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("mixed type in shorthand property", () => {
  const declarations = [
    {
      name: "padding",
      value: "solid 1rem 1mozmm 1px",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_1]);
  expect(issues.length).toBe(2);

  const expectedIssues = [
    {
      type: WebCompat.ISSUE_TYPE.CSS_VALUE,
      property: "padding",
      value: "1rem",
      unsupportedBrowsers: [FIREFOX_1],
    },
    {
      type: WebCompat.ISSUE_TYPE.CSS_VALUE,
      experimental: true,
      property: "padding",
      value: "1mozmm",
      unsupportedBrowsers: [FIREFOX_1],
    },
  ];

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const expectedIssue = expectedIssues[i];
    assertIssue(issue, expectedIssue);
  }
});

test("aliases does not support all browsers", () => {
  const declarations = [
    {
      name: "background-image",
      value: "linear-gradient(top,#f5f5f5,#f1f1f1)",
    },
    {
      name: "background-image",
      value: "-moz-linear-gradient(top,#f5f5f5,#f1f1f1)",
    }
  ];

  const issues =
    webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69, FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_VALUE_ALIASES,
    property: "background-image",
    value: "linear-gradient",
    aliases: ["linear-gradient", "-moz-linear-gradient"],
    unsupportedBrowsers: [FIREFOX_1]
  };
  assertIssue(issues[0], expectedIssue);
});

test("multiple aliases support all browsers", () => {
  const declarations = [
    {
      name: "background-image",
      value: "linear-gradient(top,#f5f5f5,#f1f1f1)",
    },
    {
      name: "background-image",
      value: "-moz-linear-gradient(top,#f5f5f5,#f1f1f1)",
    }
  ];

  const issues =
    webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69, FIREFOX_4]);
  expect(issues.length).toBe(0);
});

function assertIssue(actualIssue, expectedIssue) {
  expect(actualIssue.type).toBe(expectedIssue.type);
  expect(actualIssue.property).toBe(expectedIssue.property);
  expect(actualIssue.value).toBe(expectedIssue.value);
  expect(actualIssue.issueTerm).toBe(expectedIssue.issueTerm);
  expect(!!actualIssue.deprecated).toBe(!!expectedIssue.deprecated);
  expect(!!actualIssue.experimental).toBe(!!expectedIssue.experimental);
  expect(!!actualIssue.unsupportedBrowsers).toBe(!!expectedIssue.unsupportedBrowsers);
  expect(!!actualIssue.aliases).toBe(!!expectedIssue.aliases);

  if (actualIssue.aliases) {
    expect(actualIssue.aliases.length).toBe(expectedIssue.aliases.length);
    for (let i = 0; i < actualIssue.aliases.length; i++) {
      expect(actualIssue.aliases[i]).toBe(expectedIssue.aliases[i]);
    }
  }

  if (actualIssue.unsupportedBrowsers) {
    const actualUnsupportedBrowsers = actualIssue.unsupportedBrowsers;
    const expectedUnsupportedBrowsers = expectedIssue.unsupportedBrowsers;
    expect(actualUnsupportedBrowsers.length).toBe(expectedUnsupportedBrowsers.length);

    for (let i = 0; i < actualUnsupportedBrowsers.length; i++) {
      expect(actualUnsupportedBrowsers[i]).toBe(expectedUnsupportedBrowsers[i]);
    }
  }
}
