'use strict';

const compatData = require("mdn-browser-compat-data")
const fs = require("fs")
const path = require("path")

const payload = {
  browsers: compatData.browsers,
  css: compatData.css,
  html: compatData.html,
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
