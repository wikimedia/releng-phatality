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
  title: string,
  desc: string,
  url: string,
}

export function makeTitle(doc) {
  // When a runtime error is logged by PHP, this is turned into an ErrorException
  // temporarily to obtain a trace. It is not actually an exception that is thrown
  // or left uncaught, though, so report only the message that PHP developers are
  // familiar with from their server logs or IDE (ignore the fake class).
  if (doc['exception.class'] === 'ErrorException') {
    return doc['exception.message'];
  }

  // MediaWiki does not (yet) override normalized_message for exceptions to omit
  // the reqId/url placeholders (which we want to exclude from the task title).
  // For now, immitate what MediaWiki's MWExceptionHandler.php#getLogNormalMessage does
  // but without those placeholders in front.
  if (doc['exception.class']) {
    return `${doc['exception.class']}: ${doc['exception.message']}`;
  } else {
    return doc.normalized_message || doc.message;
  }
}

export function makeAnonymousUrl(server, urlPath) {
  if (!server || !urlPath) {
    return '';
  }
  const url = `https://${server}${urlPath}`;
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((value, param) => {
      // Replace values that may be personal or personally identifying,
      // either by themselves or through correlation (differential privacy).
      //
      // Exception is made for query params that are system-defined with
      // finite possible values that describe the entry point or route
      // inside the application and are thus fairly popular/common.
      //
      // - action: Accepted by index.php and api.php.
      //           Longest known value is "centralnoticecdncacheupdatebanner".
      //
      // Sanity check the value.
      if (!['action'].includes(param) || !/^[a-z]{1,35}$/.test(value)) {
        parsed.searchParams.set(param, '*');
      }
    });
    return parsed.toString();
  } catch (e) {
    // Ignore if it contains invalid encoding.
    // If relevant to the task, someone might add an anonymous form of it manually,
    // or developer can look it up in Logstash.
    return '';
  }
}

function makeLogstashTimedQueryUrl(key, value, timestamp) {
  // Give the query a 1-2 day range, instead of all of `from:now-90d,to:now` (which would be slow).
  // It would make sense to reduce this to just a 1 hour range, but that's not actually much faster,
  // and it's problem because, despite ISO dates having a trailing Z both in doc.timestamp, and
  // in Date#toISOString output, Kibana still manages to get timezone-confused, which means
  // people outside UTC wouldn't find anything.
  let from = timestamp ? new Date(timestamp) : new Date();
  from.setDate(from.getDate() - 1);
  from = from.toISOString();
  let to = new Date(timestamp);
  to.setDate(to.getDate() + 1);
  to.setTime(Math.min(to.getTime(), Date.now()));
  to = to.toISOString();

  // Use the main "mediawiki" dashboard
  return 'https://logstash.wikimedia.org/app/dashboards#/view/AXFV7JE83bOlOASGccsT'
    // Kibana uses the incomprensible Rison format for this purpose.
    // It is important that the values use single quotes, not double quotes.
    // https://www.elastic.co/guide/en/kibana/7.12/url_templating-language.html
    // https://github.com/w33ble/rison-node
    + `?_g=(time:(from:'${from}',to:'${to}'))`
    // Use double quotes on the inner portion (that's the Lucene query)
    + `&_a=(query:(query_string:(query:${encodeURI(`'${key}:"${value}"'`)})))`
}

/** Make the url for a Last 30 days query */
function makeLogstashRecentQueryUrl(key, value) {
  return 'https://logstash.wikimedia.org/app/dashboards#/view/AXFV7JE83bOlOASGccsT'
    + `?_g=(time:(from:now-30d,to:now))`
    // Use double quotes on the inner portion (that's the Lucene query)
    + `&_a=(query:(query_string:(query:${encodeURI(`'${key}:"${value}"'`)})))`
}

function sanitizeTrace(trace) {
  if (trace && /['"]/.test(trace)) {
    // Redacted stack traces from MediaWiki only contain file paths, methods, and arg types.
    // If a quote character is found, it most likely means redaction is broken,
    // or that the fatal was reported by PHP outside of MWExceptionHandler's ability
    // to intercept and redact it.
    // https://phabricator.wikimedia.org/T234014
    return '(REDACTED)';
  }
  return trace;
}

/** Make the url for a pre-filled phabricator error report form */
export function makePhabDesc(doc) {
  let messageBlock = markupCodeBlock('name=normalized_message', doc.normalized_message);

  let stackBlock = markupCodeBlock('name=exception.trace,lines=10', sanitizeTrace(doc['exception.trace']));
  if (doc['exception.previous.trace']) {
    stackBlock += markupCodeBlock('name=exception.previous.trace,lines=10', sanitizeTrace(doc['exception.previous.trace']));
  }

  let desc = `==== Error  ====

* mwversion: \`${doc.mwversion}\`
* reqId: \`${doc.reqId}\`
* [[ ${makeLogstashTimedQueryUrl('reqId', doc.reqId, doc.timestamp)} | Find reqId in Logstash ]]
* [[ ${makeLogstashRecentQueryUrl('normalized_message', doc.normalized_message)} | Find normalized_message in Logstash ]]

${messageBlock}
${stackBlock}

==== Impact ====


==== Notes ====

`;

  return desc;
}

/** Make the url for a pre-filled Phabricator error report form */
export function makePhabSubmitUrl(params: PhabUrlParams) {
  let desc = makePhabDesc(params);

  const query = new URLSearchParams();
  query.append('custom.error.id', params.id);
  query.append('title', params.title);
  query.append('description', desc);
  query.append('custom.error.url', params.url);

  return `${formUrl}?${query.toString()}`;
}

/** Make the url to search phabricator for a given phatalityId */
export function makePhabSearchUrl(phatalityId) {
  return `${searchUrl}?std:maniphest:error.id=${phatalityId}#R`;
}

export function openNewTab(url) {
  window.open(url, '_blank')
}
