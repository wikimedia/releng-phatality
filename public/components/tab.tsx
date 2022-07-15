import React from 'react';
import { DocViewRenderProps } from '../types';
import { EuiButton } from "@elastic/eui";
import {
  makeAnonymousUrl,
  makePhabDesc,
  makePhabSearchUrl,
  makePhabSubmitUrl,
  makeTitle,
  openNewTab,
} from './helpers';
import { PhatalityLine, PhatalityArea } from './row';

interface PhatalityState {
  title: string,
  desc: string,
  url: string,
  phabSearchUrl: string,
  phabShortUrl: string,
  phabUrl: string,
}

export class PhatalityTab extends React.Component<DocViewRenderProps, {}> {
  state: PhatalityState;

  constructor(props:DocViewRenderProps) {
    super(props);
    let doc = props.indexPattern.flattenHit(props.hit);

    this.state = {
      title: makeTitle(doc),
      desc: makePhabDesc(doc),
      url: makeAnonymousUrl(doc.server, doc.url),
      phabSearchUrl: makePhabSearchUrl(doc),
      // Computed later
      phabShortUrl: '',
      phabUrl: ''
    };
  }

  componentDidMount(): void {
    this.setState({
      phabUrl: makePhabSubmitUrl({
        title: this.state.title,
        desc: this.state.desc,
        url: this.state.url,
      }),
      phabShortUrl: makePhabSubmitUrl({
        title: this.state.title,
        desc: '',
        url: this.state.url,
      }),
    });
  }

  render() {
    return (
      <table className="table table-condensed osdDocViewerTable">
        <tbody>
        <tr>
          <td>Phabricator actions:</td>
          <td>
            <EuiButton type="primary" size="s" onClick={() => {
              openNewTab(this.state.phabUrl.length > 1600
               ? this.state.phabShortUrl
               : this.state.phabUrl)
            }}>
              <span className="fa fa-plus"></span> Submit
            </EuiButton>
            <EuiButton type="primary" size="s" onClick={() => {openNewTab(this.state.phabSearchUrl)}}>
              <span className="fa fa-search"></span> Search
            </EuiButton>
            { this.state.phabUrl.length > 1600 &&
              <div>
                <strong>Warning</strong>: The description is too long to submit by URL. Please copy it manually.
              </div>
            }
          </td>
        </tr>
        <PhatalityLine field='title' value={this.state.title}/>
        <PhatalityArea field='desc' value={this.state.desc}/>
        <PhatalityLine field='url' value={this.state.url}/>
        </tbody>
      </table>
    );
  }
}
