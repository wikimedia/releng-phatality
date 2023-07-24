const helpers = require('../public/components/helpers.ts');
const { PhatalityDoc } = require('../public/components/phatalitydoc');

QUnit.module('helpers', () => {

  QUnit.test.each('makeTitle', {
    'normalized': {
      doc: {
        normalized_message: 'foo1',
        type: 'mediawiki',
      },
      title: 'foo1',
    },
    'message': {
      doc: {
        message: 'foo2',
        type: 'mediawiki',
      },
      title: 'foo2',
    },
    'prefer normalized': {
      doc: {
        normalized_message: 'foo1',
        message: 'foo2',
        type: 'mediawiki',
      },
      title: 'foo1',
    },
    'clean up fatal exception': {
      doc: {
        'exception.class': 'InvalidArgumentException',
        'exception.message': 'Cannot foo',
        normalized_message: '[{reqId}] {exception_url}   InvalidArgumentException: Cannot foo',
        message: '[fff-000-000-000-fff] /w/index.php   InvalidArgumentException: Cannot foo',
        type: 'mediawiki',
      },
      title: 'InvalidArgumentException: Cannot foo',
    },
    'clean up runtime error': {
      doc: {
        'exception.class': 'ErrorException',
        'exception.message': 'PHP Notice: Undefined index: foo',
        normalized_message: '[{reqId}] {exception_url}   PHP Notice: Undefined index: foo',
        message: '[fff-000-000-000-fff] /w/index.php   PHP Notice: Undefined index: foo',
        type: 'mediawiki',
      },
      title: 'PHP Notice: Undefined index: foo',
    },
  }, (assert, data) => {
    let doc = new PhatalityDoc(data.doc);
    assert.equal(helpers.makeTitle(doc), data.title);
  });

  QUnit.test('unsupported doc', (assert) => {
    const doc = new PhatalityDoc({
      type: 'unsupported',
    });
    assert.equal(doc.supported, false);
  });

  QUnit.test('ecs doc', (assert) => {
    const doc = new PhatalityDoc({
      'labels.normalized_message': 'foo1',
      'service.type': 'mediawiki',
    });
    assert.equal(doc.normalizedMessage, 'foo1');
  });

  QUnit.test('makePhabSearchUrl', (assert) => {
    const doc = new PhatalityDoc({
      normalized_message: 'InvalidArgumentException: Cannot foo',
      message: 'InvalidArgumentException: Cannot foo',
      type: 'mediawiki',
    });

    const actualUrl = helpers.makePhabSearchUrl(doc);
    const actual = new URL(actualUrl).searchParams.get('query');
    assert.equal(actual, '"InvalidArgumentException:" "Cannot" "foo"');
  });

  QUnit.test('makePhabSearchUrl [quotes]', (assert) => {
    const doc = new PhatalityDoc({
      message: 'Exception: Unknown action "foo"""bar"',
      type: 'mediawiki',
    });

    const actualUrl = helpers.makePhabSearchUrl(doc);
    const actual = new URL(actualUrl).searchParams.get('query');
    assert.equal(actual, '"Exception:" "Unknown" "action" "foo" "bar"');
  });

  QUnit.test('markupTable', (assert) => {
    assert.equal(
      helpers.markupTable(
        [['Foo', 'Header']],
        [['foo', 'data']],
      ),
      '\n' +
      '| Foo | Header\n' +
      '| -- | --\n' +
      '| foo | data'
    );
  });
});
