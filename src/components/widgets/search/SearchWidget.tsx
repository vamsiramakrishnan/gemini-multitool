import { withWidget } from '../withWidget';
import { SearchWidget as SearchWidgetClass } from './search-widget';
import type { SearchData } from './search-widget';
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './search-widget.scss';

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

const SearchWidget: React.FC<SearchWidgetProps> = ({ query }) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`https://api.example.com/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results);
      } catch (err) {
        setError('Failed to fetch results');
      }
      setLoading(false);
    };

    if (query) {
      fetchData();
    }
  }, [query]);

  return (
    <div className="search-widget">
      <div className="search-header">
        <h1 className="search-title">Search Results for "{query}"</h1>
        <input
          className="search-input"
          placeholder="Type your search query..."
          value={query}
          onChange={(e) => console.log(e.target.value)}
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="no-results">{error}</div>
      ) : results.length > 0 ? (
        <div className="search-results">
          {results.map((result, index) => (
            <div key={index} className="result-item">
              <div className="result-title">{result.title}</div>
              <ReactMarkdown className="result-snippet">{result.snippet}</ReactMarkdown>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">No results found.</div>
      )}
    </div>
  );
};

export default SearchWidget; 