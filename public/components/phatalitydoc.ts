import {
  ECSFields,
  LogstashFields,
  PhatalityDocKeys,
} from './fieldmappings'

interface PhatalityDocType {
  supported: boolean,
  fieldMap: PhatalityDocKeys,
  timestamp: string,
  normalizedMessage: string,
  errorType: string,
  errorMessage: string,
  requestId: string,
  version: string
  stackTrace: string,
  previousStackTrace: string,
  url: string,
  message: string,
}

/**
 * Phatality document data object
 *
 * Normalize the raw document object and provides a standardized interface to the document values.
 */
export class PhatalityDoc implements PhatalityDocType {
  public supported: boolean;
  public fieldMap: PhatalityDocKeys;
  public timestamp: string;
  public normalizedMessage: string;
  public errorType: string;
  public errorMessage: string;
  public requestId: string;
  public version: string;
  public stackTrace: string;
  public previousStackTrace: string;
  public url: string;
  public message: string;

  constructor(doc) {
    this.fieldMap = this.getFieldMapping(doc);

    if (!this.fieldMap) {
      this.supported = false;
      return this;
    }

    this.supported = true;
    this.timestamp = doc[this.fieldMap.timestamp];
    this.normalizedMessage = doc[this.fieldMap.normalizedMessage];
    this.errorType = doc[this.fieldMap.errorType];
    this.errorMessage = doc[this.fieldMap.errorMessage];
    this.requestId = doc[this.fieldMap.requestId];
    this.version = doc[this.fieldMap.version];
    this.stackTrace = doc[this.fieldMap.stackTrace];
    this.previousStackTrace = doc[this.fieldMap.previousStackTrace];
    this.url = this.getUrl(doc);
    this.message = doc[this.fieldMap.message];
  }

  /**
   * Detects appropriate field mapping based on doc attributes.
   * @param {object} doc
   * @returns {PhatalityDocKeys|undefined}
   */
  getFieldMapping(doc) {
    if (doc['service.type'] == 'mediawiki') {
      return new ECSFields();
    }
    if (doc['type'] == 'mediawiki') {
      return new LogstashFields();
    }
  }

  /**
   * Assembles a URL from 'server' and 'url' attributes when not defined.
   * @param {object} doc
   * @returns {string}
   */
  getUrl(doc) {
    if (doc[this.fieldMap.url]) {
      return doc[this.fieldMap.url];
    }
    if (!doc.server || !doc.url) {
      return '';
    }
    return `https://${doc.server}${doc.urlpath}`;
  }
}
