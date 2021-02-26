import { SearchResponse } from 'elasticsearch';
import { IndexPattern } from '../../../src/plugins/data/public';
import { DiscoverSetup, DiscoverStart } from '../../../src/plugins/discover/public';

export interface PhatalityPluginSetup {
  discover: DiscoverSetup;
}

export interface PhatalityPluginStart {
  discover: DiscoverStart
}

export type ElasticSearchHit<T = unknown> = SearchResponse<T>['hits']['hits'][number];

export interface FieldMapping {
  filterable?: boolean;
  scripted?: boolean;
  rowCount?: number;
  type: string;
  name: string;
}

export type DocViewFilterFn = (
  mapping: FieldMapping | string | undefined,
  value: unknown,
  mode: '+' | '-'
) => void;

export interface DocViewRenderProps {
  columns?: string[];
  filter?: DocViewFilterFn;
  hit: ElasticSearchHit;
  indexPattern: IndexPattern;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
}
