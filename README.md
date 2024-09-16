# phatality

> An OpenSearch Dashboards plugin to easily associate errors with Phabricator Tasks.

This adds a custom document renderer which includes two new buttons:

1. + Submit to phabricator
 * Opens the phabricator "Submit Error Code" form with values
   pre-filled with values from the selected log entry
2. ? Search Phabricator
 * Opens the Phabricator search form with a pre-filled query

---

## Development

See the [kibana external plugin development](https://www.elastic.co/guide/en/kibana/current/external-plugin-development.html) page for additional information.  (OpenSearch docs TBD.)

### Local lint and test

Run this within your isolated dev environment, or launch a [Fresh](https://gerrit.wikimedia.org/g/fresh/) shell.

One time:

```
phatality$ npm ci
```

Run QUnit tests:

```
phatality$ npm test
```

Alternatively, you can use the "test" Dockerfile target.

```
phatality$ docker build --target test -t localhost/phatality:test .
phatality$ docker run --rm -t localhost/phatality:test
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

## Deployment

To deploy to wikimedia production:

### On your workstation:
```bash
DASHBOARDS_VERSION=2.7.0
./build-zip-using-docker $DASHBOARDS_VERSION
```
This will create a ```deploy/phatality-$DASHBOARDS_VERSION.zip``` file.  Add it to the repository
and push to Gerrit, skipping code review:
```bash
git add deploy/phatality-$DASHBOARDS_VERSION.zip
git commit -m "Add deploy/phatality-$DASHBOARDS_VERSION.zip for deployment"
git push origin master
```

### On the deployment server

 fetch the change and run `scap deploy`:

- `cd /srv/deployment/releng/phatality; git pull`
- `scap deploy`

