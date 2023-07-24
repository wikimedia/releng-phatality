import { PhatalityDoc } from './phatalitydoc';
import { Stacktrace } from './stacktrace';

const searchUrl = 'https://phabricator.wikimedia.org/search/';
const formUrl = 'https://phabricator.wikimedia.org/maniphest/task/edit/form/46/';
const logstashDashboardUrl = 'https://logstash.wikimedia.org/app/dashboards#/view/AXFV7JE83bOlOASGccsT';

/** Make a phabricator remarkup code block with optional header */
export function markupCodeBlock(header:string, content:string) {
  if (!content) {
    content = header;
    header = '';
  }
  return "\n```name=" + header + ",lines=10\n" + content + "\n```";
}

/** Make a phabricator remarkup table with optional header rows */
export function markupTable(headers:Array<Array<string>>, rows:Array<Array<string>>) {
  let header = '';

  if (headers) {
    let maxWidth = 0;

    header += headers.map((cells): string => {
      if (cells.length > maxWidth) {
        maxWidth = cells.length;
      }

      return '| ' + cells.join(' | ');
    }).join("\n") + "\n";

    header += '| ' + Array.from({ length: maxWidth }, () => '--').join(' | ') + '\n';
  }

  return "\n" + header + rows.filter((cells) => cells.length > 0).map((cells): string => {
    return '| ' + cells.join(' | ');
  }).join("\n");
}

/** Make a phabricator remarkup section with header */
export function markupSection(header:string) {
  return `\n==== ${header} ====\n\n`
}

/** Make a phabricator remarkup bullet */
export function markupBullet(content:string) {
  return `* ${content}\n`
}

/** Make a phabricator remarkup hyperlink */
export function markupHyperlink(url:string, link_text:string) {
  return `[[ ${url} | ${link_text} ]]`
}

/**
 * @param {PhatalityDoc} doc
 */
export function makeTitle(doc:PhatalityDoc) {
  if (!doc.supported) {
    return '';
  }
  // Prefer normalized_message because:
  //
  // * It naturally avoids PII that shouldn't be copied to Phab.
  // * It tends to be shorter, e.g. no "ErrorException from line .." noise.
  // * It tends to be more focussed on the problem rather than specifics of one sample.
  // * It is pre-trimmed by the log producer if it is very long, which also
  //   further avoids PII from rare messages that don't use normalization.
  const title = doc.normalizedMessage || doc.message;
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
 * @param {PhatalityDoc} doc
 */
export function makeAnonymousUrl(doc:PhatalityDoc) {
  if (!doc.supported) {
    return '';
  }
  try {
    const parsed = new URL(doc.url);
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
 * @param {PhatalityDoc} doc
 */
function makeLogstashTimedQueryUrl(doc:PhatalityDoc) {
  if (!doc.supported) {
    return '';
  }
  // Give the query a 1-2 day range, instead of all of `from:now-90d,to:now` (which would be slow).
  // It would make sense to reduce this to just a 1 hour range, but that's not actually much faster,
  // and it's problem because, despite ISO dates having a trailing Z both in doc.timestamp, and
  // in Date#toISOString output, OpenSearch Dashboards still manages to get timezone-confused, which means
  // people outside UTC wouldn't find anything.
  let from = doc.timestamp ? new Date(doc.timestamp) : new Date();
  from.setDate(from.getDate() - 1);
  let fromstr = from.toISOString();
  let to = doc.timestamp ? new Date(doc.timestamp) : new Date();
  to.setDate(to.getDate() + 1);
  to.setTime(Math.min(to.getTime(), Date.now()));
  let tostr = to.toISOString();

  // Use the main "mediawiki" dashboard
  return logstashDashboardUrl
    // OpenSearch Dashboards uses the incomprehensible Rison format for this purpose.
    // It is important that the values use single quotes, not double quotes.
    // https://www.elastic.co/guide/en/kibana/7.12/url_templating-language.html
    // https://github.com/w33ble/rison-node
    + `?_g=(time:(from:'${fromstr}',to:'${tostr}'))`
    // Use double quotes on the inner portion (that's the Lucene query)
    // NOTE: reqId hardcoded for compatibility with "mediawiki" dashboard (AXFV7JE83bOlOASGccsT)
    + `&_a=(query:(query_string:(query:${encodeURI(`'reqId:"${doc.requestId}"'`)})))`
}

/**
 * Try to render the stacktrace as a table with git blame information but
 * fallback to a code block.
 */
export function markupStackTrace(header: string, trace: string) {
  try {
    return makeStackTraceTable(trace);
  } catch (e) {
    console.error(e);
    return markupCodeBlock(header, trace);
  }
}

/**
 * Make a phabricator remarkup table for the stacktrace and link location to
 * the git blame.
 **/
export function makeStackTraceTable(trace:string) {
  const stacktrace = new Stacktrace(trace);
  return markupTable(
    [['Frame', 'Location', 'Call']],
    stacktrace.frames.map(frame => {
      let location = frame.location;
      const blameURL = frame.getBlameURL();

      if (blameURL !== undefined) {
        location = markupHyperlink(blameURL.toString(), location);
      }

      return [frame.id, location, frame.call];
    }),
  );
}

/**
 * @param {string} trace
 */
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
 * @param {PhatalityDoc} doc
 */
export function makePhabDesc(doc:PhatalityDoc) {
  if (!doc.supported) {
    return '';
  }
  let output = markupSection('Error')
    + markupBullet(`${doc.fieldMap.version}: ${doc.version}`)
    + markupBullet(`${doc.fieldMap.requestId}: ${doc.requestId}`)
    + markupBullet(`${markupHyperlink(makeLogstashTimedQueryUrl(doc), `Find ${doc.fieldMap.requestId} in Logstash`)}`)
    + markupCodeBlock(doc.fieldMap.normalizedMessage, doc.normalizedMessage)
    + markupStackTrace(doc.fieldMap.stackTrace, sanitizeTrace(doc.stackTrace));
  if (doc.previousStackTrace) {
    output += markupCodeBlock(doc.fieldMap.previousStackTrace, sanitizeTrace(doc.previousStackTrace));
  }
  return output + markupSection('Impact') + markupSection('Notes');
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
 * @param {PhatalityDoc} doc
 */
export function makePhabSearchUrl(doc:PhatalityDoc) {
  if (!doc.supported) {
    return '';
  }
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
