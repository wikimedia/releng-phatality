const helpers = require('../public/components/helpers.ts');

QUnit.module('helpers', () => {

  QUnit.test.each('makeTitle', {
    'normalized': {
      doc: {
        normalized_message: 'foo1',
      },
      title: 'foo1',
    },
    'message': {
      doc: {
        message: 'foo2',
      },
      title: 'foo2',
    },
    'prefer normalized': {
      doc: {
        normalized_message: 'foo1',
        message: 'foo2',
      },
      title: 'foo1',
    },
    'clean up fatal exception': {
      doc: {
        'exception.class': 'InvalidArgumentException',
        'exception.message': 'Cannot foo',
        normalized_message: '[{reqId}] {exception_url}   InvalidArgumentException: Cannot foo',
        message: '[fff-000-000-000-fff] /w/index.php   InvalidArgumentException: Cannot foo',
      },
      title: 'InvalidArgumentException: Cannot foo',
    },
    'clean up runtime error': {
      doc: {
        'exception.class': 'ErrorException',
        'exception.message': 'PHP Notice: Undefined index: foo',
        normalized_message: '[{reqId}] {exception_url}   PHP Notice: Undefined index: foo',
        message: '[fff-000-000-000-fff] /w/index.php   PHP Notice: Undefined index: foo',
      },
      title: 'PHP Notice: Undefined index: foo',
    },
  }, (assert, data) => {
    assert.equal(helpers.makeTitle(data.doc), data.title);
  });

  QUnit.test('makePhabSearchUrl', (assert) => {
    const doc = {
      normalized_message: 'InvalidArgumentException: Cannot foo',
      message: 'InvalidArgumentException: Cannot foo',
    };

    const actualUrl = helpers.makePhabSearchUrl(doc);
    const actual = new URL(actualUrl).searchParams.get('query');
    assert.equal(actual, '"InvalidArgumentException:" "Cannot" "foo"');
  });

  QUnit.test('makePhabSearchUrl [quotes]', (assert) => {
    const doc = {
      message: 'Exception: Unknown action "foo"""bar"',
    };

    const actualUrl = helpers.makePhabSearchUrl(doc);
    const actual = new URL(actualUrl).searchParams.get('query');
    assert.equal(actual, '"Exception:" "Unknown" "action" "foo" "bar"');
  });

});
