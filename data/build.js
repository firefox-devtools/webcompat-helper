'use strict';

const CSS_PROPERTY_DATATYPES = {
  "background-image": ["image", "url"],
  "padding": ["length", "percentage", "calc"],
};

const compatData = require("mdn-browser-compat-data")
const fs = require("fs")
const path = require("path")

// This operation will not be necessary if this issue below is fixed.
// https://github.com/mdn/browser-compat-data/issues/4309
defineCSSPropertiesDataTypes(compatData);
// Define the units of <length> type which supports all browsers.
defineCSSLengthType(compatData);

const payload = {
  browsers: compatData.browsers,
  css: compatData.css,
}

const content = `export default ${ JSON.stringify(payload) };`

fs.writeFile(
  path.resolve(
    __dirname,
    "..",
    "extension",
    "webcompat-data.js"
  ),
  content,
  err => {
    if (err) {
      console.error(err)
    }
  }
)

function defineCSSPropertiesDataTypes(compatData) {
  const { properties } = compatData.css;

  // Set empty data types to all properties.
  for (const property in  properties) {
    properties[property].__dataTypes = [];
  }

  // Map data types to the property which we have the data.
  for (const [property, dataTypes] of Object.entries(CSS_PROPERTY_DATATYPES)) {
    properties[property].__dataTypes = ["global_keywords", ...dataTypes];
  }
}

function defineCSSLengthType(compatData) {
  const { browsers } = compatData;
  const { length } = compatData.css.types;

  const supportTable = {};
  for (let id in browsers) {
    supportTable[id] = { "version_added": true };
  }

  const compatTable = {
    "support": supportTable,
    "status": {
      "experimental": false,
      "standard_track": true,
      "deprecated": false
    }
  };

  // MDN Compat data looks not having following units of <length> type.
  for (const unit of ["em", "px", "cm", "mm", "in", "pc", "pt"]) {
    length[unit] = { __compat: compatTable };
  }
}
