'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeGetJSON, safeSetJSON } from '@/utils/storage';

export interface Annotation {
  id: string;
  time: number;      // Unix timestamp of the candle
  price: number;     // Price level
  text: string;      // Note text
  color: string;     // Marker color
  createdAt: number;
  symbol: string;
}

interface ChartAnnotationsProps {
  symbol: string;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  onRemoveAnnotation: (id: string) => void;
  onClearAnnotations: () => void;
  className?: string;
}

const ANNOTATION_COLORS = [
  { color: '#3b82f6', label: '🔵 Blue' },
  { color: '#22c55e', label: '🟢 Green' },
  { color: '#ef4444', label: '🔴 Red' },
  { color: '#f59e0b', label: '🟡 Yellow' },
  { color: '#8b5cf6', label: '🟣 Purple' },
];

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

export default function ChartAnnotations({
  symbol,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  onClearAnnotations,
  className = '',
}: ChartAnnotationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newText, setNewText] = useState('');
  const [newColor, setNewColor] = useState(ANNOTATION_COLORS[0].color);
  
  const symbolAnnotations = annotations.filter(a => a.symbol === symbol);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Chart Notes</h3>
          {symbolAnnotations.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
              {symbolAnnotations.length}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {/* Instructions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                editMode
                  ? 'bg-blue-500 text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-blue-500/20'
              }`}
            >
              {editMode ? '✓ Done' : '+ Add Note'}
            </button>
            {symbolAnnotations.length > 0 && (
              <button
                onClick={onClearAnnotations}
                className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* New annotation form */}
          {editMode && (
            <div className="bg-[var(--bg-hover)] rounded-lg p-3 space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Click on the chart to place a note at that candle.
              </p>
              <div>
                <label className="text-xs text-[var(--text-secondary)] block mb-1">Note text:</label>
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="e.g., Support level, Breakout, Entry point..."
                  maxLength={100}
                  className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] rounded px-3 py-1.5 text-sm border border-[var(--border)] focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Color:</label>
                {ANNOTATION_COLORS.map(c => (
                  <button
                    key={c.color}
                    onClick={() => setNewColor(c.color)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      newColor === c.color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Annotation List */}
          {symbolAnnotations.length > 0 ? (
            <div className="space-y-1.5">
              {symbolAnnotations
                .sort((a, b) => b.time - a.time)
                .map(annotation => (
                  <div
                    key={annotation.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg-hover)] group"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-0.5 shrink-0"
                      style={{ backgroundColor: annotation.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] break-words">
                        {annotation.text}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDate(annotation.time)}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          @ ${annotation.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveAnnotation(annotation.id)}
                      className="text-xs text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center text-xs text-[var(--text-secondary)] py-3">
              No notes for {symbol} yet. Add notes to track your analysis.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for managing annotations with localStorage persistence
export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAnnotations(safeGetJSON<Annotation[]>('chartwise-annotations', []));
  }, []);

  const save = useCallback((newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
    safeSetJSON('chartwise-annotations', newAnnotations);
  }, []);

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'createdAt'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
    };
    save([...annotations, newAnnotation]);
  }, [annotations, save]);

  const removeAnnotation = useCallback((id: string) => {
    save(annotations.filter(a => a.id !== id));
  }, [annotations, save]);

  const clearAnnotations = useCallback((symbol?: string) => {
    if (symbol) {
      save(annotations.filter(a => a.symbol !== symbol));
    } else {
      save([]);
    }
  }, [annotations, save]);

  const getAnnotationsForSymbol = useCallback((symbol: string) => {
    return annotations.filter(a => a.symbol === symbol);
  }, [annotations]);

  return {
    annotations,
    mounted,
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
    getAnnotationsForSymbol,
  };
}
