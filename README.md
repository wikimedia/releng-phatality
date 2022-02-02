# phatality

> An OpenSearch Dashboards plugin to easily associate errors with Phabricator Tasks.

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

See the [kibana external plugin development](https://www.elastic.co/guide/en/kibana/current/external-plugin-development.html) page for additional information.  (OpenSearch docs TBD.)

### Quickstart
Ensure you have yarn and the required node version installed.  Node version can be found in the OpenSearch Dashboards repo in the `.node-version` file.

```bash
  export $DASHBOARDS_VERSION='1.2.0'
  git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git
  cd OpenSearch-Dashboards
  git checkout tags/$DASHBOARDS_VERSION"
  yarn osd bootstrap
  cd plugins
  git clone "https://gerrit.wikimedia.org/r/releng/phatality" && (cd "phatality" && mkdir -p .git/hooks && curl -Lo `git rev-parse --git-dir`/hooks/commit-msg https://gerrit.wikimedia.org/r/tools/hooks/commit-msg; chmod +x `git rev-parse --git-dir`/hooks/commit-msg)
```

Now we can start the development server.  Make sure you have a local instance of ElasticSearch running.
```
  cd OpenSearch-Dashboards
  yarn start --oss
```

## Deployment

To deploy to wikimedia production:

### On your workstation:
```bash
  cd OpenSearch-Dashboards/plugins/phatality
  yarn build --opensearch-dashboards-version 1.2.0
  cp build/*.zip deploy/
  git add deploy/*; git commit -m 'updated zip for deployment'
  git push origin master
```

### On the deployment server

 fetch the change and run `scap deploy`:

- `cd /srv/deployment/releng/phatality; git pull`
- `scap deploy`

