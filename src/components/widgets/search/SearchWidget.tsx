import { withWidget } from '../withWidget';
import { SearchWidget as SearchWidgetClass } from './search-widget';
import type { SearchData } from './search-widget';

export interface SearchSupport {
  groundingChunkIndices: number[];
  segment: {
    text: string;
  };
}

export interface SearchChunk {
  index: number;
  web?: {
    title?: string;
    uri?: string;
  };
  score?: number;
}

export interface SearchEntryPoint {
  renderedContent?: string;
}

export interface GroundingMetadata {
  groundingChunks: SearchChunk[];
  groundingSupports: SearchSupport[];
  searchEntryPoint?: SearchEntryPoint;
  webSearchQueries?: string[];
}

export type SearchWidgetProps = SearchData;

export const SearchWidget = withWidget<SearchWidgetProps>(
  SearchWidgetClass,
  'SearchWidget'
); 