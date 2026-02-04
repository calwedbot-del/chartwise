import { OHLCV } from './indicators';

export function exportToCSV(data: OHLCV[], symbol: string, timeframe: string): void {
  // Create CSV header
  const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];
  
  // Convert data to CSV rows
  const rows = data.map(candle => {
    const date = new Date(candle.time * 1000).toISOString();
    return [
      date,
      candle.open.toFixed(2),
      candle.high.toFixed(2),
      candle.low.toFixed(2),
      candle.close.toFixed(2),
      candle.volume?.toFixed(2) || '0'
    ].join(',');
  });

  // Combine header and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `chartwise_${symbol}_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: OHLCV[], symbol: string, timeframe: string): void {
  const exportData = {
    symbol,
    timeframe,
    exportedAt: new Date().toISOString(),
    dataPoints: data.length,
    data: data.map(candle => ({
      date: new Date(candle.time * 1000).toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume || 0
    }))
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `chartwise_${symbol}_${timeframe}_${new Date().toISOString().split('T')[0]}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
