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

test("<length> type", () => {
  const supportedUnits = [
    "cap", "ch", "em", "ex", "ic", "lh", "rem", "rlh", "vh", "vw", "vi", "vb",
    "vmin", "vmax", "px", "cm", "mm", "Q", "in", "pc", "pt", "mozmm",
  ];

  const declarations = [
    {
      // <length> type allows 0.
      name: "padding",
      value: 0,
    }
  ];

  for (const unit of supportedUnits) {
    declarations.push({ name: "padding", value: `1${ unit }` });
  }

  // Even if there are several issues such as experimental value, they should be valid.
  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.every(i => !i.invalid)).toBe(true);
});

test("<percentage> type", () => {
  const declarations = [
    {
      name: "padding",
      value: "1%",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("<calc> type", () => {
  const declarations = [
    {
      name: "padding",
      value: "calc(1px + 1%)",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("<url> type", () => {
  const declarations = [
    {
      name: "background-image",
      value: "url(sample.png)",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("global keywords type", () => {
  const declarations = [
    {
      name: "padding",
      value: "initial",
    },
    {
      name: "padding",
      value: "inherit",
    },
    {
      name: "padding",
      value: "unset",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("unknown value", () => {
  const declarations = [
    {
      name: "padding",
      value: "invalid-value",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_VALUE,
    invalid: true,
    property: "padding",
    value: "invalid-value",
    unsupportedBrowsers: [],
  };
  assertIssue(issues[0], expectedIssue);
});

test("unacceptable value", () => {
  const declarations = [
    {
      name: "padding",
      value: 50,
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_VALUE,
    invalid: true,
    property: "padding",
    value: 50,
    unsupportedBrowsers: [],
  };
  assertIssue(issues[0], expectedIssue);
});

test("valid and invalid mixed value in shorthand property", () => {
  const declarations = [
    {
      name: "padding",
      value: "solid 10 5deg 1px",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(3);

  const expectedIssues = [
    {
      type: WebCompat.ISSUE_TYPE.CSS_VALUE,
      invalid: true,
      property: "padding",
      value: "solid",
      unsupportedBrowsers: [],
    },
    {
      type: WebCompat.ISSUE_TYPE.CSS_VALUE,
      invalid: true,
      property: "padding",
      value: 10,
      unsupportedBrowsers: [],
    },
    {
      type: WebCompat.ISSUE_TYPE.CSS_VALUE,
      invalid: true,
      property: "padding",
      value: "5deg",
      unsupportedBrowsers: [],
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
  expect(!!actualIssue.invalid).toBe(!!expectedIssue.invalid);
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
