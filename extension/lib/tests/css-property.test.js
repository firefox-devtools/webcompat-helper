import { WebCompat } from "../webcompat";
import webCompatData from "./webcompat-data.js";
const webcompat = new WebCompat(webCompatData);

const FIREFOX_69 = {
  name: "firefox",
  version: "69",
};

const FIREFOX_1 = {
  name: "firefox",
  version: "1",
};

const SAFARI_13 = {
  name: "safari",
  version: "13",
};

test("a supported property", () => {
  const declarations = [
    {
      name: "background-color",
      value: "lime",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("some supported properties", () => {
  const declarations = [
    {
      name: "background-color",
      value: "lime",
    },
    {
      name: "color",
      value: "lime",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("a non supported property", () => {
  const declarations = [
    {
      name: "grid-column",
      value: "1",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY,
    property: "grid-column",
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issues[0], expectedIssue);
});

test("an invalid property", () => {
  const declarations = [
    {
      name: "invalid-property",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY,
    invalid: true,
    property: "invalid-property",
  };
  assertIssue(issues[0], expectedIssue);
});

test("a deprecated property", () => {
  const declarations = [
    {
      name: "clip",
      value: "auto",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY,
    property: "clip",
    deprecated: true,
  };
  assertIssue(issues[0], expectedIssue);
});

test("a experimental property", () => {
  const declarations = [
    {
      name: "border-block-color",
      value: "lime",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY,
    property: "border-block-color",
    experimental: true,
  };
  assertIssue(issues[0], expectedIssue);
});

test("a property having some issues", () => {
  const declarations = [
    {
      name: "font-variant-alternates",
      value: "normal",
    }
  ];

  const issues = webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY,
    property: "font-variant-alternates",
    deprecated: true,
    experimental: true,
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issues[0], expectedIssue);
});

test("a aliased property which does not support all", () => {
  const declarations = [
    {
      name: "-moz-user-select",
      value: "auto",
    }
  ];

  const issues =
    webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69, SAFARI_13]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY_ALIASES,
    property: "user-select",
    aliases: ["-moz-user-select"],
    experimental: true,
    unsupportedBrowsers: [SAFARI_13],
  };
  assertIssue(issues[0], expectedIssue);
});

test("aliased properties which support all", () => {
  const declarations = [
    {
      name: "-moz-user-select",
      value: "auto",
    },
    {
      name: "-webkit-user-select",
      value: "auto",
    }
  ];

  const issues =
    webcompat.getCSSDeclarationBlockIssues(declarations, [FIREFOX_69, SAFARI_13]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.CSS_PROPERTY_ALIASES,
    property: "user-select",
    aliases: ["-moz-user-select", "-webkit-user-select"],
    experimental: true,
  };
  assertIssue(issues[0], expectedIssue);
});

function assertIssue(actualIssue, expectedIssue) {
  expect(actualIssue.type).toBe(expectedIssue.type);
  expect(actualIssue.property).toBe(expectedIssue.property);
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
