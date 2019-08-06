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

test("a supported global attribute", () => {
  const elementName = "body";
  const attributes = [{ name: "id", value: "test-id" }];
  const issues = webcompat.getHTMLElementIssues(elementName, attributes, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("a supported global attribute but different element", () => {
  const elementName = "div";
  const attributes = [{ name: "id", value: "test-id" }];
  const issues = webcompat.getHTMLElementIssues(elementName, attributes, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("a non supported html attribute", () => {
  const elementName = "a";
  const attributeName = "download";
  const attributeValue = "test.png";
  const attributes = [{ name: attributeName, value: attributeValue }];
  const issues =
    webcompat.getHTMLElementIssues(elementName, attributes, [FIREFOX_69, FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ATTRIBUTE,
    element: elementName,
    attribute: attributeName,
    value: attributeValue,
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issues[0], expectedIssue);
});

test("an experimental html attribute", () => {
  const elementName = "menu";
  const attributeName = "label";
  const attributeValue = "test";
  const attributes = [{ name: attributeName, value: attributeValue }];
  const issues = webcompat.getHTMLElementIssues(elementName, attributes, [FIREFOX_69]);
  expect(issues.length).toBe(2);

  const expectedElementIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    experimental: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issues[0], expectedElementIssue);

  const expectedAttributeIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ATTRIBUTE,
    element: elementName,
    attribute: attributeName,
    value: attributeValue,
    experimental: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issues[1], expectedAttributeIssue);
});

test("a deprecated html attribute", () => {
  const elementName = "table";
  const attributeName = "align";
  const attributeValue = "left";
  const attributes = [{ name: attributeName, value: attributeValue }];
  const issues = webcompat.getHTMLElementIssues(elementName, attributes, [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ATTRIBUTE,
    element: elementName,
    attribute: attributeName,
    value: attributeValue,
    deprecated: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issues[0], expectedIssue);
});

test("a data-* attribute", () => {
  const elementName = "body";
  const attributes = [{ name: "data-test", value: "test value" }];
  const issues = webcompat.getHTMLElementIssues(elementName, attributes, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("an invalid html attributes are ignored " +
     "because they are commonly used by frameworks", () => {
  const elementName = "div";
  const attributeName = "invalid";
  const attributeValue = "invalid value";
  const attributes = [{ name: attributeName, value: attributeValue }];
  const issues = webcompat.getHTMLElementIssues(elementName, attributes, [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

function assertIssue(actualIssue, expectedIssue) {
  expect(actualIssue.type).toBe(expectedIssue.type);
  expect(actualIssue.element).toBe(expectedIssue.element);
  expect(actualIssue.attribute).toBe(expectedIssue.attribute);
  expect(actualIssue.value).toBe(expectedIssue.value);
  expect(!!actualIssue.invalid).toBe(!!expectedIssue.invalid);
  expect(!!actualIssue.deprecated).toBe(!!expectedIssue.deprecated);
  expect(!!actualIssue.experimental).toBe(!!expectedIssue.experimental);
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
