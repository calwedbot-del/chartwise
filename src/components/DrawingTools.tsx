'use client';

import { useState } from 'react';

export type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'rectangle' | 'text' | 'fibonacci';

export interface Drawing {
  id: string;
  type: DrawingTool;
  points: { time: number; price: number }[];
  color: string;
  text?: string;
}

interface DrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  drawings: Drawing[];
  onClearDrawings: () => void;
  onUndoDrawing: () => void;
  drawingColor?: string;
  onColorChange?: (color: string) => void;
  className?: string;
}

const TOOLS = [
  { id: 'none' as DrawingTool, icon: '🖱️', label: 'Select', shortcut: 'Esc' },
  { id: 'trendline' as DrawingTool, icon: '📐', label: 'Trend Line', shortcut: 'T' },
  { id: 'horizontal' as DrawingTool, icon: '➖', label: 'Horizontal', shortcut: 'H' },
  { id: 'fibonacci' as DrawingTool, icon: '📊', label: 'Fibonacci', shortcut: 'F' },
  { id: 'rectangle' as DrawingTool, icon: '⬜', label: 'Rectangle', shortcut: 'R' },
  { id: 'text' as DrawingTool, icon: '📝', label: 'Text', shortcut: 'X' },
];

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ffffff', // white
];

export default function DrawingTools({
  activeTool,
  onToolChange,
  drawings,
  onClearDrawings,
  onUndoDrawing,
  drawingColor,
  onColorChange,
  className = ''
}: DrawingToolsProps) {
  const [showColors, setShowColors] = useState(false);
  const selectedColor = drawingColor || COLORS[0];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Tool buttons */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
        {TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`p-2 rounded-md text-sm transition-colors ${
              activeTool === tool.id
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => setShowColors(!showColors)}
          className="w-8 h-8 rounded-md border-2 border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: selectedColor }}
          title="Drawing color"
        />
        {showColors && (
          <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex gap-1 z-50">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => {
                  onColorChange?.(color);
                  setShowColors(false);
                }}
                className={`w-6 h-6 rounded-md border-2 ${
                  selectedColor === color ? 'border-blue-500' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={onUndoDrawing}
          disabled={drawings.length === 0}
          className="p-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
          title="Undo (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          onClick={onClearDrawings}
          disabled={drawings.length === 0}
          className="p-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
          title="Clear all drawings"
        >
          🗑️
        </button>
      </div>

      {/* Drawing count */}
      {drawings.length > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

// Hook for managing drawings
export function useDrawings() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [currentDrawing, setCurrentDrawing] = useState<Partial<Drawing> | null>(null);

  const addDrawing = (drawing: Drawing) => {
    setDrawings(prev => [...prev, drawing]);
  };

  const removeDrawing = (id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
  };

  const undoDrawing = () => {
    setDrawings(prev => prev.slice(0, -1));
  };

  const clearDrawings = () => {
    setDrawings([]);
  };

  const startDrawing = (point: { time: number; price: number }, color: string) => {
    if (activeTool === 'none') return;
    
    setCurrentDrawing({
      id: Date.now().toString(),
      type: activeTool,
      points: [point],
      color,
    });
  };

  const updateDrawing = (point: { time: number; price: number }) => {
    if (!currentDrawing) return;
    
    setCurrentDrawing(prev => ({
      ...prev!,
      points: [...(prev?.points || []).slice(0, 1), point],
    }));
  };

  const finishDrawing = (point?: { time: number; price: number }) => {
    if (!currentDrawing || !currentDrawing.points?.length) return;
    
    const finalPoints = point 
      ? [...currentDrawing.points.slice(0, 1), point]
      : currentDrawing.points;

    if (finalPoints.length >= (activeTool === 'horizontal' ? 1 : 2)) {
      addDrawing({
        ...currentDrawing,
        points: finalPoints,
      } as Drawing);
    }
    
    setCurrentDrawing(null);
  };

  return {
    drawings,
    activeTool,
    currentDrawing,
    setActiveTool,
    addDrawing,
    removeDrawing,
    undoDrawing,
    clearDrawings,
    startDrawing,
    updateDrawing,
    finishDrawing,
  };
}
