'use client';

import { useState, useEffect, useRef } from 'react';
import { searchAssets } from '@/lib/api';

interface AssetSearchProps {
  onSelect: (symbol: string) => void;
  currentAsset: string;
}

interface SearchResult {
  id: string;
  symbol: string;
  name: string;
}

export default function AssetSearch({ onSelect, currentAsset }: AssetSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const searchResults = await searchAssets(query);
      setResults(searchResults);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] transition-colors"
        >
          <span>🔍</span>
          <span className="hidden md:inline">Search assets...</span>
          <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-[var(--bg-hover)] rounded">/</kbd>
        </button>
      )}

      {/* Search Input */}
      {isOpen && (
        <div className="absolute top-0 left-0 z-50 w-72">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any crypto..."
              className="w-full px-4 py-2 pl-10 rounded-lg bg-[var(--bg-card)] border border-[var(--accent)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              🔍
            </span>
            {loading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                ⏳
              </span>
            )}
          </div>

          {/* Results Dropdown */}
          {results.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result.symbol)}
                  className={`w-full px-4 py-2 text-left hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-between ${
                    result.symbol === currentAsset ? 'bg-[var(--accent)]/10' : ''
                  }`}
                >
                  <div>
                    <span className="font-medium text-[var(--text-primary)]">{result.symbol}</span>
                    <span className="ml-2 text-sm text-[var(--text-secondary)]">{result.name}</span>
                  </div>
                  {result.symbol === currentAsset && (
                    <span className="text-[var(--accent)] text-xs">current</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="absolute top-full mt-1 w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 text-center text-[var(--text-secondary)]">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
