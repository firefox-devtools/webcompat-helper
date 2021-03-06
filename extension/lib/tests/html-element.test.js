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
  const issues = webcompat.getHTMLElementIssues(elementName, [], [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

test("a non supported html element", () => {
  const elementName = "main";
  const issues = webcompat.getHTMLElementIssues(elementName, [], [FIREFOX_69, FIREFOX_1]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    url: "https://developer.mozilla.org/docs/Web/HTML/Element/main",
    unsupportedBrowsers: [FIREFOX_1],
  };
  assertIssue(issues[0], expectedIssue);
});

test("an experimental html element", () => {
  const elementName = "menu";
  const issues = webcompat.getHTMLElementIssues(elementName, [], [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    url: "https://developer.mozilla.org/docs/Web/HTML/Element/menu",
    experimental: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issues[0], expectedIssue);
});

test("a deprecated html element", () => {
  const elementName = "frame";
  const issues = webcompat.getHTMLElementIssues(elementName, [], [FIREFOX_69]);
  expect(issues.length).toBe(1);

  const expectedIssue = {
    type: WebCompat.ISSUE_TYPE.HTML_ELEMENT,
    element: elementName,
    url: "https://developer.mozilla.org/docs/Web/HTML/Element/frame",
    deprecated: true,
    unsupportedBrowsers: [],
  };
  assertIssue(issues[0], expectedIssue);
});

test("an invalid html element", () => {
  const elementName = "invalid";
  const issues = webcompat.getHTMLElementIssues(elementName, [], [FIREFOX_69]);
  expect(issues.length).toBe(0);
});

function assertIssue(actualIssue, expectedIssue) {
  expect(actualIssue.type).toBe(expectedIssue.type);
  expect(actualIssue.element).toBe(expectedIssue.element);
  expect(actualIssue.url).toBe(expectedIssue.url);
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
