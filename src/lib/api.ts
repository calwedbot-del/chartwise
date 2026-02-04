import axios from 'axios';
import { OHLCV } from '@/utils/indicators';

// CoinGecko API for crypto
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Crypto ID mapping
const CRYPTO_IDS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'XRP': 'ripple',
  'SUI': 'sui',
  'DOGE': 'dogecoin',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'DOT': 'polkadot',
};

// Timeframe to seconds mapping
const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
};

export interface AssetInfo {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
}

// Fetch OHLCV data for crypto
export async function fetchCryptoOHLCV(
  symbol: string,
  timeframe: string = '1d',
  days: number = 90
): Promise<OHLCV[]> {
  const id = CRYPTO_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
  
  try {
    const response = await axios.get(`${COINGECKO_BASE}/coins/${id}/ohlc`, {
      params: {
        vs_currency: 'usd',
        days: days,
      },
    });
    
    const data = response.data as number[][];
    
    return data.map(([time, open, high, low, close]) => ({
      time: Math.floor(time / 1000),
      open,
      high,
      low,
      close,
    }));
  } catch (error) {
    console.error('Error fetching OHLCV:', error);
    return [];
  }
}

// Fetch current price and info
export async function fetchAssetInfo(symbol: string): Promise<AssetInfo | null> {
  const id = CRYPTO_IDS[symbol.toUpperCase()] || symbol.toLowerCase();
  
  try {
    const response = await axios.get(`${COINGECKO_BASE}/coins/${id}`, {
      params: {
        localization: false,
        tickers: false,
        community_data: false,
        developer_data: false,
      },
    });
    
    const data = response.data;
    
    return {
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      price: data.market_data.current_price.usd,
      change24h: data.market_data.price_change_percentage_24h,
      volume24h: data.market_data.total_volume.usd,
      marketCap: data.market_data.market_cap.usd,
      high24h: data.market_data.high_24h.usd,
      low24h: data.market_data.low_24h.usd,
    };
  } catch (error) {
    console.error('Error fetching asset info:', error);
    return null;
  }
}

// Fetch multiple assets for watchlist
export async function fetchWatchlistPrices(symbols: string[]): Promise<Map<string, AssetInfo>> {
  const ids = symbols.map(s => CRYPTO_IDS[s.toUpperCase()] || s.toLowerCase()).join(',');
  
  try {
    const response = await axios.get(`${COINGECKO_BASE}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        ids: ids,
        order: 'market_cap_desc',
        sparkline: false,
        price_change_percentage: '24h',
      },
    });
    
    const result = new Map<string, AssetInfo>();
    
    for (const coin of response.data) {
      result.set(coin.symbol.toUpperCase(), {
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        volume24h: coin.total_volume,
        marketCap: coin.market_cap,
        high24h: coin.high_24h,
        low24h: coin.low_24h,
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return new Map();
  }
}

// Search for assets
export async function searchAssets(query: string): Promise<{ id: string; symbol: string; name: string }[]> {
  try {
    const response = await axios.get(`${COINGECKO_BASE}/search`, {
      params: { query },
    });
    
    return response.data.coins.slice(0, 10).map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
    }));
  } catch (error) {
    console.error('Error searching assets:', error);
    return [];
  }
}

// Get list of supported assets
export function getSupportedAssets(): { symbol: string; name: string; type: 'crypto' | 'stock' }[] {
  return [
    // Crypto
    { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
    { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
    { symbol: 'SOL', name: 'Solana', type: 'crypto' },
    { symbol: 'XRP', name: 'Ripple', type: 'crypto' },
    { symbol: 'SUI', name: 'Sui', type: 'crypto' },
    // Stocks
    { symbol: 'INTU', name: 'Intuit', type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet', type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft', type: 'stock' },
    { symbol: 'META', name: 'Meta', type: 'stock' },
    { symbol: 'AAPL', name: 'Apple', type: 'stock' },
  ];
}

// Fetch stock OHLCV data via our API proxy (avoids CORS issues)
export async function fetchStockOHLCV(
  symbol: string,
  days: number = 90
): Promise<OHLCV[]> {
  try {
    const response = await axios.get(`/api/stock/${symbol}`, {
      params: { days },
    });
    
    return response.data.candles || [];
  } catch (error) {
    console.error('Error fetching stock OHLCV:', error);
    return [];
  }
}

// Fetch stock info via our API proxy
export async function fetchStockInfo(symbol: string): Promise<AssetInfo | null> {
  try {
    const response = await axios.get(`/api/stock/${symbol}`, {
      params: { days: 5 },
    });
    
    const data = response.data;
    return {
      symbol: data.symbol,
      name: data.name,
      price: data.price,
      change24h: data.change24h,
      volume24h: data.volume24h,
      marketCap: data.marketCap,
      high24h: data.high24h,
      low24h: data.low24h,
    };
  } catch (error) {
    console.error('Error fetching stock info:', error);
    return null;
  }
}
