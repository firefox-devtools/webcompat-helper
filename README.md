# webcompat-helper

This is the repository for an experimental Firefox DevTools extension.

The extension provides web compatibility information about the currently selected element as a new sidebar panel in the inspector.

# Running the extension

To run the extension locally, first clone the repository, and then run the following commands:

* `npm install`
* `npm run dev`

This will automatically start Firefox Nightly with the extension already installed. Visit any website, open the inspector, and look for the Compatibility tab in the sidebar.

# Running the tests

Tests are located in `extension/lib/test/` and can be run with the following command: `npm run test`.
