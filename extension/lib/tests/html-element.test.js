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

test("a supported html element", () => {
  const elementName = "body";
  const issue = webcompat.getHTMLElementIssue(elementName, [FIREFOX_69]);
  expect(issue).toBeNull();
});

test("a non supported html element", () => {
  const elementName = "main";
  const issue = webcompat.getHTMLElementIssue(elementName, [FIREFOX_69, FIREFOX_1]);
  expect(issue).not.toBeNull();

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issue, expectedIssue);
});

test("an experimental html element", () => {
  const elementName = "menu";
  const issue = webcompat.getHTMLElementIssue(elementName, [FIREFOX_69]);
  expect(issue).not.toBeNull();

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    experimental: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issue, expectedIssue);
});

test("a deprecated html element", () => {
  const elementName = "frame";
  const issue = webcompat.getHTMLElementIssue(elementName, [FIREFOX_69]);
  expect(issue).not.toBeNull();

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    deprecated: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issue, expectedIssue);
});

test("an invalid html element", () => {
  const elementName = "invalid";
  const issue = webcompat.getHTMLElementIssue(elementName, [FIREFOX_69]);
  expect(issue).not.toBeNull();

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    invalid: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issue, expectedIssue);
});

function assertIssue(actualIssue, expectedIssue) {
  expect(actualIssue.type).toBe(expectedIssue.type);
  expect(actualIssue.element).toBe(expectedIssue.element);
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
