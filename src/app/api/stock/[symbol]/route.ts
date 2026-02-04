import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol.toUpperCase();
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '90');
  
  try {
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (days * 24 * 60 * 60);
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d&includePrePost=false`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Yahoo API returned ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];
    const meta = result.meta;
    
    // Build OHLCV array
    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (quotes.open[i] && quotes.high[i] && quotes.low[i] && quotes.close[i]) {
        candles.push({
          time: timestamps[i],
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume?.[i] || 0,
        });
      }
    }
    
    // Calculate 24h change
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const currentPrice = meta.regularMarketPrice;
    const change24h = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
    
    return NextResponse.json({
      symbol,
      name: meta.shortName || meta.longName || symbol,
      price: currentPrice,
      change24h,
      volume24h: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || 0,
      high24h: meta.regularMarketDayHigh || currentPrice,
      low24h: meta.regularMarketDayLow || currentPrice,
      candles,
    });
  } catch (error) {
    console.error('Stock API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
