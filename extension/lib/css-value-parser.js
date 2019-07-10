"use strict";

import { CSSLexer } from "./css-lexer.js";

class CSSValueParser {
  constructor() {
    this._lexer = new CSSLexer();
  }

  parse(value) {
    if (!value) {
      return [];
    }

    this._lexer.parse(value.toString());
    const result = [];
    this._next(result);
    return result;
  }

  _next(result) {
    const token = this._lexer.nextToken();
    if (!token) {
      return;
    }

    const { tokenType: type } = token;
    switch (type) {
      case "string":
      case "ident":
      case "url": {
        result.push({ type, value: token.text })
        break;
      }
      case "percentage":
      case "number": {
        result.push({ type, value: token.number })
        break;
      }
      case "dimension": {
        result.push({ type, value: token.number, unit: token.text })
        break;
      }
      case "function": {
        const contents = [];
        this._next(contents)
        result.push({ type, value: token.text, contents })
        break;
      }
      case "symbol": {
        if (token.text === ")") {
          // End of function.
          return;
        }

        result.push({ type, value: token.text })
        break;
      }
    }

    this._next(result);
  }
}

export { CSSValueParser };
