# phatality

> An OpenSearch Dashboards plugin to easily associate errors with Phabricator Tasks.

This adds a custom document renderer which includes two new buttons:

1. `+` Submit to phabricator
 * Opens the phabricator "Submit Error Code" form with values
   pre-filled with values from the selected log entry
2. `?` Search Phabricator
 * Opens the Phabricator search form with a pre-filled query

---

## Development

See the [kibana external plugin development](https://www.elastic.co/guide/en/kibana/current/external-plugin-development.html) page for additional information.  (OpenSearch docs TBD.)

### Local lint and test

```
make prepare
make test
```

## Quickstart

Ensure you have yarn and the required node version installed.  Node version can be found in the OpenSearch Dashboards repo in the `.node-version` file.

```bash
  export DASHBOARDS_VERSION='2.7.0'
  git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git
  cd OpenSearch-Dashboards
  git checkout "tags/$DASHBOARDS_VERSION"
  yarn osd bootstrap
  cd plugins
  git clone "https://gerrit.wikimedia.org/r/releng/phatality" && (cd "phatality" && mkdir -p .git/hooks && curl -Lo `git rev-parse --git-dir`/hooks/commit-msg https://gerrit.wikimedia.org/r/tools/hooks/commit-msg; chmod +x `git rev-parse --git-dir`/hooks/commit-msg)
```

Now we can start the development server.  Make sure you have a local instance of OpenSearch running.
```
  cd OpenSearch-Dashboards
  yarn start --oss
```

## Versions

Plugins must be built against the [target OpenSearch Dashboards version](https://opensearch.org/docs/latest/install-and-configure/plugins/).  To facilitate this, [plugins have a 4th versioning digit for patch levels](https://github.com/opensearch-project/opensearch-plugins/blob/main/BUILDING.md#consume-dynamic-versions-of-opensearch-dependencies):
```
<semver opensearch version>.<plugin version>
```

Example: `2.7.0.1` = OpenSearch Dashboards `2.7.0`, Phatality version `1`

To set the version, update package.json with the four-digit version number and the Makefile will handle its propagation.

## Building

Requires git, make, jq, and docker or podman.
```bash
make prepare
make build
```
This will create a ```phatality-<version>.zip``` file in the root directory.  Upload this artifact to `apt.wikimedia.org:/srv/opensearch/`.
Once the artifact is uploaded, create a patch to bump the phatality version in Puppet (`profile::opensearch::dashboards::phatality::version`).  Once this Puppet patch is merged, Puppet will ensure the new version is installed.
