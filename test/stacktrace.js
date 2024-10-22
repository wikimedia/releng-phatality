const stacktrace = require('../public/components/stacktrace.ts');
const { test } = QUnit;

QUnit.module('stacktrace', () => {
  QUnit.module('Frame', () => {
    test('fromLine() [valid] deepest frame', assert => {
      assert.deepEqual(
        stacktrace.Frame.fromLine('from /srv/foo/bar.php(123)'),
        new stacktrace.Frame('from', '/srv/foo/bar.php(123)'),
      );
    });

    test('fromLine() [valid] numbered frame', assert => {
      assert.deepEqual(
        stacktrace.Frame.fromLine('#6 /srv/foo/bar.php(123): Foo->bar()'),
        new stacktrace.Frame('#6', '/srv/foo/bar.php(123)', 'Foo->bar()'),
      );
    });

    test('fromLine() [valid] main frame', assert => {
      assert.deepEqual(
        stacktrace.Frame.fromLine('#6 {main}'),
        new stacktrace.Frame('#6', '{main}'),
      );
    });

    test('fromLine() [invalid]', assert => {
      assert.throws(() => stacktrace.Frame.fromLine('something is wrong'));
    });

    test('new [valid] generic frame', assert => {
      const frame = new stacktrace.Frame('#6', '/srv/foo/bar.php(123)', 'Foo->bar()');
      const { parsedFrame } = frame;

      assert.ok(parsedFrame instanceof stacktrace.GenericFrame);
      assert.equal(parsedFrame.file, 'bar.php');
      assert.equal(parsedFrame.line, 123);
    });

    test('new [valid] MediaWiki frame', assert => {
      const frame = new stacktrace.Frame('#6', '/srv/mediawiki/php-1.41.0-wmf.1/includes/foo.php(123)', 'Foo->bar()');
      const { parsedFrame } = frame;

      assert.ok(parsedFrame instanceof stacktrace.MediaWikiFrame);
      assert.equal(parsedFrame.file, 'php-1.41.0-wmf.1/includes/foo.php');
      assert.equal(parsedFrame.line, 123);
      assert.equal(parsedFrame.project, 'mediawiki/core');
      assert.equal(parsedFrame.projectFile, 'includes/foo.php');
    });

    test('new [valid] main frame', assert => {
      const frame = new stacktrace.Frame('#6', '{main}');

      assert.ok(frame.parsedFrame === undefined);
    });
  });

  QUnit.module('GenericFrame', () => {
    test('getBlameURL()', assert => {
      const frame = new stacktrace.GenericFrame('foo.php', 123);

      assert.ok(frame.getBlameURL() === undefined);
    });
  });

  QUnit.module('MediaWikiFrame', () => {
    test('new [valid] core', assert => {
      const frame = new stacktrace.MediaWikiFrame('php-1.41.0-wmf.1/includes/Foo.php', 123);

      assert.equal(frame.file, 'php-1.41.0-wmf.1/includes/Foo.php');
      assert.equal(frame.line, 123);
      assert.equal(frame.project, 'mediawiki/core');
      assert.equal(frame.projectRef, 'refs/heads/wmf/1.41.0-wmf.1');
      assert.equal(frame.projectFile, 'includes/Foo.php');
    });

    test('new [valid] vendor', assert => {
      const frame = new stacktrace.MediaWikiFrame('php-1.41.0-wmf.1/vendor/diff/Diff.php', 123);

      assert.equal(frame.file, 'php-1.41.0-wmf.1/vendor/diff/Diff.php');
      assert.equal(frame.line, 123);
      assert.equal(frame.project, 'mediawiki/vendor');
      assert.equal(frame.projectRef, 'refs/heads/wmf/1.41.0-wmf.1');
      assert.equal(frame.projectFile, 'diff/Diff.php');
    });

    test('new [valid] extensions', assert => {
      const frame = new stacktrace.MediaWikiFrame('php-1.41.0-wmf.1/extensions/Foo/src/Bar/Baz.php', 123);

      assert.equal(frame.file, 'php-1.41.0-wmf.1/extensions/Foo/src/Bar/Baz.php');
      assert.equal(frame.line, 123);
      assert.equal(frame.project, 'mediawiki/extensions/Foo');
      assert.equal(frame.projectRef, 'refs/heads/wmf/1.41.0-wmf.1');
      assert.equal(frame.projectFile, 'src/Bar/Baz.php');
    });

    test('new [valid] skins', assert => {
      const frame = new stacktrace.MediaWikiFrame('php-1.41.0-wmf.1/skins/Foo/src/Bar/Baz.php', 123);

      assert.equal(frame.file, 'php-1.41.0-wmf.1/skins/Foo/src/Bar/Baz.php');
      assert.equal(frame.line, 123);
      assert.equal(frame.project, 'mediawiki/skins/Foo');
      assert.equal(frame.projectRef, 'refs/heads/wmf/1.41.0-wmf.1');
      assert.equal(frame.projectFile, 'src/Bar/Baz.php');
    });

    test('new [valid] mediawiki-config', assert => {
      const frame = new stacktrace.MediaWikiFrame('w/index.php', 123);

      assert.equal(frame.file, 'w/index.php');
      assert.equal(frame.line, 123);
      assert.equal(frame.project, 'operations/mediawiki-config');
      assert.equal(frame.projectRef, 'refs/heads/master');
      assert.equal(frame.projectFile, 'w/index.php');
    });

    test('getBlameURL()', assert => {
      const frame = new stacktrace.MediaWikiFrame('php-1.41.0-wmf.1/includes/Foo.php', 123);

      assert.deepEqual(
        frame.getBlameURL(),
        new URL('https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+blame/refs/heads/wmf/1.41.0-wmf.1/includes/Foo.php#123'),
      );
    });
  });
});
