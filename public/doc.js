import { DocViewsRegistryProvider } from 'ui/registry/doc_views';

import docTemplate from './templates/doc.html';

const versionPattern = /\/srv\/mediawiki\/php-(\d\.\d+\.\d+-wmf\.\d+)/g;
const searchUrl = 'https://phabricator.wikimedia.org/maniphest/query/advanced/';
const formUrl = 'https://phabricator.wikimedia.org/maniphest/task/edit/form/46/';

/** Convert the message digest into a hex string encoding */
function hexString(buffer) {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(value => {
    const hexCode = value.toString(16);
    const paddedHexCode = hexCode.padStart(2, '0');
    return paddedHexCode;
  });
  return hexCodes.join('');
}

function digestSha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return window.crypto.subtle.digest('SHA-256', data);
}

/** Make a phabricator remarkup code block with optional header */
function markupCodeBlock(header, content) {
  if (!content) {
    content = header;
    header = "";
  }
  return "\n```"+ header + "\n" + content + "\n```";
}

/** Make the url for a pre-filled phabricator error report form */
function makePhabUrl(doc) {
  var message = getField(doc, 'message');
  var messageBlock = markupCodeBlock('name=message', message);
  var version = doc['mwversion']||'n/a';
  var desc = `=== Error  ===
\`MediaWiki version:\`  	**\`${version}\`**
${messageBlock}

=== Impact ===

=== Notes ===`;

  var stack = markupCodeBlock('name=exception.trace,lines=10',
  doc['exception.trace'] || doc['fatal_exception.trace'] || 'n/a');

  if (doc['exception.previous.trace']) {
    stack += markupCodeBlock('name=exception.previous.trace,lines=10',
      doc['exception.previous.trace']);
  }

  stack = stack.replace(versionPattern, '');

  const params = {
    "title": message,
    "description": desc,
    "custom.error.stack": stack,
    "custom.error.reqid": doc['reqId'],
    "custom.error.url": doc['exception_url'] || 'n/a',
  }

  const query = new URLSearchParams();

  if (doc['phatalityId']) {
    query.append('custom.error.id', doc['phatalityId']);
  }
  for (const [key, val] of Object.entries(params)) {
    query.append(key, val);
  }
  return `${formUrl}?${query.toString()}`
}

/** Make the url to search phabricator for a given phatalityId */
function makePhabSearchUrl(phatalityId) {
  return `${searchUrl}?std:maniphest:error.id=${phatalityId}#R`;
}

function getField(doc, fieldName) {
  var value =doc['exception.'+fieldName]
       || doc['fatal_exception.'+fieldName]
       || doc[fieldName] || '';

  return value.replace(versionPattern, '') + "\n";
}

/** make a unique string that identifies an error and remains stable
 * across multiple WMF production versions of mediawiki & extensions. */
function makePhatalityId(doc) {
  var phatalityId = getField(doc, 'message')
                   + getField(doc, 'class')
                   + getField(doc, 'file');

  return phatalityId;
}

DocViewsRegistryProvider.register(function () {
    return {
      title: 'Phatality',
      order: 30,
      directive: {
        template: docTemplate,
        scope: {
          hit: '=',
          indexPattern: '=',
          filter: '=',
          columns: '=',
          onAddColumn: '=',
          onRemoveColumn: '=',
        },
        controller: function ($scope) {

          $scope.mapping = $scope.indexPattern.fields.byName;
          $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
          $scope.formatted = $scope.indexPattern.formatHit($scope.hit);
          $scope.fields = _.keys($scope.flattened).sort();
          $scope.fields.unshift('phatalityId');
          $scope.mapping['phatalityId'] = $scope.mapping['message'];

          var phatalityId = makePhatalityId($scope.flattened);
          // Make a hash of the phatalityId instead of using the raw string:
          digestSha256(phatalityId).then(digestValue => {
            phatalityId = hexString(digestValue);
            $scope.formatted['phatalityId'] =
             $scope.flattened['phatalityId'] = phatalityId;
          });

          $scope.submitToPhab = function(fields) {
            window.open(makePhabUrl(fields), '_blank');
          };
          $scope.searchPhab = function(id) {
            window.open(makePhabSearchUrl(id), '_blank');
          };

        }
      }
    };
  });