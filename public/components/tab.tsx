import React from 'react';
import { DocViewRenderProps } from '../types';
import { EuiButton } from "@elastic/eui";
import {
  makePhatalityIdSrc,
  digestSha256,
  hexString,
  makePhabDesc,
  makePhabSearchUrl,
  makePhabSubmitUrl,
  makeTitle,
  openNewTab,
} from './helpers';
import { PhatalityLine, PhatalityArea } from './row';

export class PhatalityTab extends React.Component<DocViewRenderProps, {}> {

  constructor(props) {
    super(props);
    let doc = props.indexPattern.flattenHit(props.hit);
    this.state = {
      phatalityIdSrc: doc.normalized_message || doc.message,
      title: makeTitle(doc),
      desc: makePhabDesc(doc),
      url: makeAnonymousUrl(doc),
      // Computed later
      phatalityId: '',
      phabSearchUrl: '',
      phabUrl: ''
    };
  }


  componentDidMount(): void {
    // Make a hash of the phatalityId instead of using the raw string:
    digestSha256(this.state.phatalityIdSrc).then(digestValue => {
      let digestString = hexString(digestValue);
      this.setState({
        phatalityId: digestString,
        phabSearchUrl: makePhabSearchUrl(digestString),
        phabUrl: makePhabSubmitUrl({
          id: digestString,
          title: this.state.title,
          desc: this.state.desc,
          url: this.state.url
        }),
      });
    });
  }

  render() {
    return (
      <table className="table table-condensed kbnDocViewerTable">
        <tbody>
        <tr>
          <td>Phabricator actions:</td>
          <td>
            <EuiButton type="primary" size="s" onClick={() => {openNewTab(this.state.phabUrl)}}>
              <span className="fa fa-plus"></span> Submit
            </EuiButton>
            <EuiButton type="primary" size="s" onClick={() => {openNewTab(this.state.phabSearchUrl)}}>
              <span className="fa fa-search"></span> Search
            </EuiButton>
          </td>
        </tr>
        <PhatalityLine field='phatalityId' value={this.state.phatalityId}/>
        <PhatalityLine field='title' value={this.state.title}/>
        <PhatalityArea field='desc' value={this.state.desc}/>
        <PhatalityLine field='url' value={this.state.url}/>
        </tbody>
      </table>
    );
  }
}
