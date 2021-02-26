import React from 'react';
import { DocViewRenderProps } from '../types';
import { EuiButton } from "@elastic/eui";
import {
  getField,
  makePhatalityId,
  digestSha256,
  hexString,
  makePhabSearchUrl,
  makePhabUrl,
  openNewTab,
} from './helpers';
import { PhatalityRow } from './row';

export class PhatalityTab extends React.Component<DocViewRenderProps, {}> {

  constructor(props) {
    super(props);
    let doc = props.indexPattern.flattenHit(props.hit);
    this.state = {
      phatalityIdSrc: makePhatalityId(doc),
      phatalityId: '',
      phabSearchUrl: '',
      phabUrl: '',
      message: getField(doc, 'message', 'n/a'),
      version: doc.mwversion || 'n/a',
      url: doc.server && doc.url ? `https://${doc.server}${doc.url}` : 'n/a',
      exception_trace: doc['exception.trace'] || doc['fatal_exception.trace'] || 'n/a',
      previous_trace: doc['exception.previous.trace'],
      requestId: doc.reqId || 'n/a',
    };
  }


  componentDidMount(): void {
    // Make a hash of the phatalityId instead of using the raw string:
    digestSha256(this.state.phatalityIdSrc).then(digestValue => {
      let digestString = hexString(digestValue);
      this.setState({
        phatalityId: digestString,
        phabSearchUrl: makePhabSearchUrl(digestString),
        phabUrl: makePhabUrl({
          id: digestString,
          exception_trace: this.state.exception_trace,
          message: this.state.message,
          previous_trace: this.state.previous_trace,
          requestId: this.state.requestId,
          url: this.state.url,
          version: this.state.version
        }),
      });
    });
  }

  render() {
    return (
      <table className="table table-condensed kbnDocViewerTable">
        <tbody>
        <tr>
          <td>Phatality actions:</td>
          <td>
            <EuiButton type="primary" size="s" onClick={() => {openNewTab(this.state.phabUrl)}}>
              <span className="fa fa-plus"></span> Submit
            </EuiButton>
            <EuiButton type="primary" size="s" onClick={() => {openNewTab(this.state.phabSearchUrl)}}>
              <span className="fa fa-search"></span> Search
            </EuiButton>
          </td>
        </tr>
        <PhatalityRow field='phatalityId' value={this.state.phatalityId}/>
        <PhatalityRow field='message' value={this.state.message}/>
        <PhatalityRow field='version' value={this.state.version}/>
        <PhatalityRow field='url' value={this.state.url}/>
        <PhatalityRow field='stack' value={this.state.stack}/>
        <PhatalityRow field='requestId' value={this.state.requestId}/>
        </tbody>
      </table>
    );
  }
}
