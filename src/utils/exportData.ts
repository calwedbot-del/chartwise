import { OHLCV, RSI, MACD, SMA, BollingerBands } from './indicators';
import { AIAnalysis } from './aiAnalysis';

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

// Generate a comprehensive PDF report
export interface PdfReportData {
  symbol: string;
  timeframe: string;
  data: OHLCV[];
  assetInfo?: {
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    high24h: number;
    low24h: number;
  } | null;
  aiAnalysis?: AIAnalysis | null;
  chartScreenshot?: string | null; // base64 PNG data URL
}

export function exportToPDF(report: PdfReportData): void {
  const { symbol, timeframe, data, assetInfo, aiAnalysis, chartScreenshot } = report;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate summary stats
  const closes = data.map(d => d.close);
  const rsiValues = RSI(closes);
  const currentRSI = rsiValues[rsiValues.length - 1];
  const macdData = MACD(closes);
  const currentMACD = macdData.histogram[macdData.histogram.length - 1];
  const sma20 = SMA(closes, 20);
  const currentSMA20 = sma20[sma20.length - 1];
  const sma50 = SMA(closes, 50);
  const currentSMA50 = sma50[sma50.length - 1];
  const periodHigh = Math.max(...data.map(d => d.high));
  const periodLow = Math.min(...data.map(d => d.low));
  const periodReturn = data.length > 1
    ? ((data[data.length - 1].close - data[0].close) / data[0].close * 100)
    : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ChartWise Report - ${symbol}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #30363d; padding-bottom: 20px; }
  .title { font-size: 28px; font-weight: bold; background: linear-gradient(to right, #58a6ff, #3fb950); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { color: #8b949e; font-size: 14px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #58a6ff; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .card-label { font-size: 12px; color: #8b949e; margin-bottom: 4px; }
  .card-value { font-size: 20px; font-weight: 700; }
  .positive { color: #3fb950; }
  .negative { color: #f85149; }
  .neutral { color: #d29922; }
  .chart-img { width: 100%; border-radius: 8px; margin: 12px 0; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-bullish { background: rgba(63,185,80,0.2); color: #3fb950; }
  .badge-bearish { background: rgba(248,81,73,0.2); color: #f85149; }
  .badge-sideways { background: rgba(139,148,158,0.2); color: #8b949e; }
  .sr-level { padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 4px; }
  .support { background: rgba(63,185,80,0.1); border: 1px solid rgba(63,185,80,0.3); }
  .resistance { background: rgba(248,81,73,0.1); border: 1px solid rgba(248,81,73,0.3); }
  .summary { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; line-height: 1.6; }
  .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #30363d; text-align: center; color: #484f58; font-size: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">ChartWise Report</div>
      <div class="subtitle">${symbol} &bull; ${timeframe} &bull; ${dateStr}</div>
    </div>
    ${aiAnalysis ? `
    <div>
      <span class="badge badge-${aiAnalysis.trend}">${aiAnalysis.trend.toUpperCase()} (${aiAnalysis.trendStrength}%)</span>
      <div style="margin-top:8px;text-align:right;">
        <strong>${aiAnalysis.recommendation}</strong>
        <span style="color:#8b949e;margin-left:8px;">Score: ${aiAnalysis.sentimentScore > 0 ? '+' : ''}${aiAnalysis.sentimentScore}</span>
      </div>
    </div>
    ` : ''}
  </div>

  ${assetInfo ? `
  <div class="section">
    <div class="section-title">Market Overview</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">Price</div>
        <div class="card-value">$${assetInfo.price.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-label">24h Change</div>
        <div class="card-value ${assetInfo.change24h >= 0 ? 'positive' : 'negative'}">${assetInfo.change24h >= 0 ? '+' : ''}${assetInfo.change24h.toFixed(2)}%</div>
      </div>
      <div class="card">
        <div class="card-label">24h Volume</div>
        <div class="card-value">$${assetInfo.volume24h ? (assetInfo.volume24h / 1e9).toFixed(2) + 'B' : '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">Market Cap</div>
        <div class="card-value">$${assetInfo.marketCap ? (assetInfo.marketCap / 1e9).toFixed(0) + 'B' : '—'}</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${chartScreenshot ? `
  <div class="section">
    <div class="section-title">Chart</div>
    <img class="chart-img" src="${chartScreenshot}" alt="Chart for ${symbol}" />
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Technical Indicators</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">RSI (14)</div>
        <div class="card-value ${currentRSI > 70 ? 'negative' : currentRSI < 30 ? 'positive' : 'neutral'}">${isNaN(currentRSI) ? '—' : currentRSI.toFixed(1)}</div>
        <div style="font-size:11px;color:#8b949e;">${currentRSI > 70 ? 'Overbought' : currentRSI < 30 ? 'Oversold' : 'Neutral'}</div>
      </div>
      <div class="card">
        <div class="card-label">MACD Histogram</div>
        <div class="card-value ${currentMACD > 0 ? 'positive' : 'negative'}">${isNaN(currentMACD) ? '—' : currentMACD.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-label">SMA 20</div>
        <div class="card-value">$${isNaN(currentSMA20) ? '—' : currentSMA20.toFixed(2)}</div>
      </div>
      <div class="card">
        <div class="card-label">SMA 50</div>
        <div class="card-value">$${isNaN(currentSMA50) ? '—' : currentSMA50.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Period Statistics</div>
    <div class="grid">
      <div class="card">
        <div class="card-label">Period High</div>
        <div class="card-value">$${periodHigh.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
      </div>
      <div class="card">
        <div class="card-label">Period Low</div>
        <div class="card-value">$${periodLow.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
      </div>
      <div class="card">
        <div class="card-label">Period Return</div>
        <div class="card-value ${periodReturn >= 0 ? 'positive' : 'negative'}">${periodReturn >= 0 ? '+' : ''}${periodReturn.toFixed(2)}%</div>
      </div>
      <div class="card">
        <div class="card-label">Data Points</div>
        <div class="card-value">${data.length}</div>
      </div>
    </div>
  </div>

  ${aiAnalysis ? `
  <div class="section">
    <div class="section-title">AI Analysis</div>
    <div class="summary">${aiAnalysis.summary}</div>
    ${aiAnalysis.supportResistance.length > 0 ? `
    <div style="margin-top:12px;">
      <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Support &amp; Resistance</div>
      <div class="grid-2">
        ${aiAnalysis.supportResistance.map(sr => `
          <div class="sr-level ${sr.type}">
            <strong>${sr.type === 'support' ? '🟢' : '🔴'} ${sr.type.charAt(0).toUpperCase() + sr.type.slice(1)}</strong>
            — $${sr.price.toFixed(2)} (${sr.touches} touches)
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by ChartWise — AI-Powered Technical Analysis</p>
    <p style="margin-top:4px;">${dateStr} &bull; Not financial advice.</p>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
