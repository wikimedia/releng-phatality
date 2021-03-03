const versionPattern = /\/srv\/mediawiki\/php-(\d\.\d+\.\d+-wmf\.\d+)/g;
const searchUrl = 'https://phabricator.wikimedia.org/maniphest/query/advanced/';
const formUrl = 'https://phabricator.wikimedia.org/maniphest/task/edit/form/46/';

/** Convert the message digest into a hex string encoding */
export function hexString(buffer) {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map(value => {
    const hexCode = value.toString(16);
    return hexCode.padStart(2, '0');
  });
  return hexCodes.join('');
}

export function digestSha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return window.crypto.subtle.digest('SHA-256', data);
}

/** Make a phabricator remarkup code block with optional header */
export function markupCodeBlock(header, content) {
  if (!content) {
    content = header;
    header = '';
  }
  return "\n```" + header + "\n" + content + "\n```";
}

interface PhabUrlParams {
  id: string,
  message: string,
  version: string,
  url: string,
  exception_trace: string,
  previous_trace: string,
  requestId: string,
}

/** Make the url for a pre-filled phabricator error report form */
export function makePhabUrl(params: PhabUrlParams) {
  let messageBlock = markupCodeBlock('name=message', params.message);
  let desc = `=== Error  ===
\`MediaWiki version:\`  	**\`${params.version}\`**
${messageBlock}

=== Impact ===

=== Notes ===`;

  let stack = markupCodeBlock('name=exception.trace,lines=10', params.exception_trace);

  if (params.previous_trace !== undefined) {
    stack += markupCodeBlock('name=exception.previous.trace,lines=10', params.previous_trace);
  }

  const query = new URLSearchParams();

  query.append('custom.error.id', params.id);
  query.append('title', params.message);
  query.append('description', desc);
  query.append('custom.error.stack', stack);
  query.append('custom.error.reqId', params.requestId);
  query.append('custom.error.url', params.url);

  return `${formUrl}?${query.toString()}`;
}

/** Make the url to search phabricator for a given phatalityId */
export function makePhabSearchUrl(phatalityId) {
  return `${searchUrl}?std:maniphest:error.id=${phatalityId}#R`;
}

/** gets the value of a named field from doc
 * This looks for several variants of the named field, in order:
 * 1. exception.{fieldName}
 * 2. {fieldName}
 * Finally returning a default value if none are found.
 */
export function getField(doc, fieldName, defaultVal) {
  defaultVal = defaultVal || '';
  return (doc['exception.'+fieldName]
    || doc[fieldName]
    || defaultVal) + "\n";
}

/** Removes the version prefix from paths */
export function trimVersion(value) {
  return value.replace(versionPattern, '');
}

/** make a unique string that identifies an error and remains stable
 * across multiple WMF production versions of mediawiki & extensions. */
export function makePhatalityId(doc) {
  return trimVersion(getField(doc, 'message'))
    + getField(doc, 'class')
    + trimVersion(getField(doc, 'file' ));
}

export function openNewTab(url) {
  window.open(url, '_blank')
}
