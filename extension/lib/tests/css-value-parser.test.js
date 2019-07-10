"use strict";

import { CSSValueParser } from "../css-value-parser";
const cssValueParser = new CSSValueParser();

test("ident type", () => {
  const inputValue = "sample-ident";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "ident",
    value: "sample-ident",
  };

  assertResult(results[0], expectedResult);
});

test("url type", () => {
  const inputValue = "url(sample-url)";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "url",
    value: "sample-url",
  };

  assertResult(results[0], expectedResult);
});

test("string type", () => {
  const inputValue = "\"sample-string\"";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "string",
    value: "sample-string",
  };

  assertResult(results[0], expectedResult);
});

test("number type", () => {
  const inputValue = 100;

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "number",
    value: 100,
  };

  assertResult(results[0], expectedResult);
});

test("percentage type", () => {
  const inputValue = "10%";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "percentage",
    value: 0.1,
  };

  assertResult(results[0], expectedResult);
});

test("dimension type", () => {
  const inputValue = "10sample-unit";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "dimension",
    value: 10,
    unit: "sample-unit",
  };

  assertResult(results[0], expectedResult);
});

test("function type", () => {
  const inputValue = "sample-func(10sample-unit + sample-ident)";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "function",
    value: "sample-func",
    contents: [
      {
        type: "dimension",
        value: 10,
        unit: "sample-unit",
      },
      {
        type: "symbol",
        value: "+",
      },
      {
        type: "ident",
        value: "sample-ident",
      }
    ],
  };

  assertResult(results[0], expectedResult);
});

test("nested function type", () => {
  const inputValue = "sample-func(10sample-unit + nested-func(sample-ident))";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(1);

  const expectedResult = {
    type: "function",
    value: "sample-func",
    contents: [
      {
        type: "dimension",
        value: 10,
        unit: "sample-unit",
      },
      {
        type: "symbol",
        value: "+",
      },
      {
        type: "function",
        value: "nested-func",
        contents: [
          {
            type: "ident",
            value: "sample-ident",
          },
        ]
      }
    ],
  };

  assertResult(results[0], expectedResult);
});

test("multiple values", () => {
  const inputValue = "5sample-unit sample-ident 10% 10 sample-func()";

  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(5);

  const expectedResults = [
    {
      type: "dimension",
      value: 5,
      unit: "sample-unit",
    },
    {
      type: "ident",
      value: "sample-ident",
    },
    {
      type: "percentage",
      value: 0.1,
    },
    {
      type: "number",
      value: 10,
    },
    {
      type: "function",
      value: "sample-func",
      contents: [],
    },
  ];

  for (let i = 0; i < results.length; i++) {
    assertResult(results[i], expectedResults[i]);
  }
});

test("null type", () => {
  const inputValue = null;
  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(0);
});

test("empty string type", () => {
  const inputValue = "";
  const results = cssValueParser.parse(inputValue);
  expect(results.length).toBe(0);
});

function assertResult(actualResult, expectedResult) {
  expect(actualResult.type).toBe(expectedResult.type);
  expect(actualResult.value).toBe(expectedResult.value);
  expect(actualResult.unit).toBe(expectedResult.unit);
  expect(!!actualResult.contents).toBe(!!expectedResult.contents);

  if (actualResult.contents) {
    expect(actualResult.contents.length).toBe(expectedResult.contents.length);
    for (let i = 0; i < actualResult.contents.length; i++) {
      assertResult(actualResult.contents[i], expectedResult.contents[i]);
    }
  }
}
