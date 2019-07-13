# phatality

> A kibana plugin to easily associate errors with Phabricator Tasks.

This adds a custom document renderer which includes two new buttons:

1. + Submit to phabricator
 * Opens the phabricator "Submit Error Code" form with values
   pre-filled with values from the selected log entry
2. ? Search Phabricator
 * Opens the phabricator advanced search form with the Phatality ID
   pre-filled

The "Phatality ID" is a sha256 hash of a few log entry fields combined
such that it should uniquely identify a given error but remain stable
across multiple wmf production branches.

Specifically, the Mediawiki version number is stripped from error messages
and stack traces so that errors on the `wmf.n` and `wmf.n+1` branches will
both resolve to the same hash. That is, so long as only the filesystem path
prefix is different but the file name, function name, etc remain unchanged.

---

## development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions setting up your development environment. Once you have completed that, use the following npm tasks.

  - `npm start`

    Start kibana and have it include this plugin

  - `npm start -- --config kibana.yml`

    You can pass any argument that you would normally send to `bin/kibana` by putting them after `--` when running `npm start`

  - `npm run build`

    Build a distributable archive in build/ subdirectory

  - `npm run test:browser`

    Run the browser tests in a real web browser

  - `npm run test:server`

    Run the server tests using mocha

For more information about any of these commands run `npm run ${task} -- --help`.
