const searchUrl = 'https://phabricator.wikimedia.org/search/';
const formUrl = 'https://phabricator.wikimedia.org/maniphest/task/edit/form/46/';

/** Make a phabricator remarkup code block with optional header */
export function markupCodeBlock(header, content) {
  if (!content) {
    content = header;
    header = '';
  }
  return "\n```" + header + "\n" + content + "\n```";
}

/**
 * @param {Record<string, any>} doc
 */
export function makeTitle(doc) {
  // Prefer normalized_message because:
  //
  // * It naturally avoids PII that shouldn't be copied to Phab.
  // * It tends to be shorter, e.g. no "ErrorException from line .." noise.
  // * It tends to be more focussed on the problem rather than specifics of one sample.
  // * It is pre-trimmed by the log producer if it is very long, which also
  //   further avoids PII from rare messages that don't use normalization.
  const title = doc.normalized_message || doc.message;
  return title
    // Strip "[{reqId}] {exception_url}   "
    //
    // MediaWiki should omit these. It does already for most messages, since
    // they are part of the log context either way, but for exceptions we still
    // put it in there as otherwise reqId/url wouldn't be in debug.log during
    // CI and development.
    .replace(/^\s*\[{reqId}\]\s*{exception_url}\s*/, '');
}

/**
 * @param {string|undefined} server
 * @param {string|undefined} urlPath
 */
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

/**
 * @param {string} key
 * @param {string} value
 * @param {string|undefined} timestamp
 */
function makeLogstashTimedQueryUrl(key, value, timestamp) {
  // Give the query a 1-2 day range, instead of all of `from:now-90d,to:now` (which would be slow).
  // It would make sense to reduce this to just a 1 hour range, but that's not actually much faster,
  // and it's problem because, despite ISO dates having a trailing Z both in doc.timestamp, and
  // in Date#toISOString output, OpenSearch Dashboards still manages to get timezone-confused, which means
  // people outside UTC wouldn't find anything.
  let from = timestamp ? new Date(timestamp) : new Date();
  from.setDate(from.getDate() - 1);
  let fromstr = from.toISOString();
  let to = timestamp ? new Date(timestamp) : new Date();
  to.setDate(to.getDate() + 1);
  to.setTime(Math.min(to.getTime(), Date.now()));
  let tostr = to.toISOString();

  // Use the main "mediawiki" dashboard
  return 'https://logstash.wikimedia.org/app/dashboards#/view/AXFV7JE83bOlOASGccsT'
    // OpenSearch Dashboards uses the incomprehensible Rison format for this purpose.
    // It is important that the values use single quotes, not double quotes.
    // https://www.elastic.co/guide/en/kibana/7.12/url_templating-language.html
    // https://github.com/w33ble/rison-node
    + `?_g=(time:(from:'${fromstr}',to:'${tostr}'))`
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

/**
 * Make the url for a pre-filled phabricator error report form
 * @param {Record<string, any>} doc
 */
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

${messageBlock}
${stackBlock}

==== Impact ====


==== Notes ====

`;

  return desc;
}

/**
 * @typedef {Object} PhabUrlParams
 * @property {string} id
 * @property {string} title
 * @property {string} desc
 * @property {string} url
 */

/**
 * Make the url for a pre-filled Phabricator error report form
 * @param {PhabUrlParams} params
 */
export function makePhabSubmitUrl(params) {
  const query = new URLSearchParams();
  query.append('title', params.title);
  query.append('description', params.desc);
  query.append('custom.error.url', params.url);

  return `${formUrl}?${query.toString()}`;
}

/**
 * Make the url to search query for open tasks on Phabricator
 * @param {Record<string, any>} doc
 */
export function makePhabSearchUrl(doc) {
  // Phabricator search treats colons and other characters as special,
  // thus searching "Exception: Missing foo" (unquoted) causes an error.
  //
  // As workaround, quote each word. Don't quote in one go, in order
  // to retain loose matching, which helps find related tasks and avoids
  // duplicate tasks with variations on the same title.
  const title = makeTitle(doc);
  const stripped = title.replace(/"+/g, ' ').trim();
  const titleEnc = encodeURIComponent('"' + stripped.replace(/\s+/g, '" "') + '"');
  return `${searchUrl}?search:primary=true&search:scope=open-tasks&query=${titleEnc}#R`;
}

/**
 * @param {string} url
 */
export function openNewTab(url) {
  window.open(url, '_blank')
}
