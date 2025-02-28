
export interface PhatalityDocKeys {
  timestamp: string,
  normalizedMessage: string,
  errorType: string,
  errorMessage: string,
  requestId: string,
  phpversion: string,
  version: string,
  stackTrace: string,
  previousStackTrace: string,
  url: string,
  message: string,
}

/**
 * ECS fields mapping
 */
export class ECSFields implements PhatalityDocKeys {
  timestamp: string = '@timestamp';
  normalizedMessage: string = 'labels.normalized_message';
  errorType: string = 'error.type';
  errorMessage: string = 'error.message';
  requestId: string = 'trace.id';
  phpversion: string = 'labels.phpversion';
  version: string = 'service.version';
  stackTrace: string = 'error.stack_trace';
  previousStackTrace: string = 'error.stack.previous_trace';
  url: string = 'url.full';
  message: string = 'message';
}

/**
 * Logstash fields mapping
 */
export class LogstashFields implements PhatalityDocKeys {
  timestamp: string = '@timestamp';
  normalizedMessage: string = 'normalized_message';
  errorType: string = 'exception.class';
  errorMessage: string = 'exception.message';
  requestId: string = 'reqId';
  phpversion: string = 'phpversion';
  version: string = 'mwversion';
  stackTrace: string = 'exception.trace';
  previousStackTrace: string = 'exception.previous.trace';
  url: string = '__must_be_generated'
  message: string = 'message';
}
