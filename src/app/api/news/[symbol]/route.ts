import { NextRequest, NextResponse } from 'next/server';
import RSSParser from 'rss-parser';

const parser = new RSSParser();

// Defense-in-depth caching
const CACHE_TTL = 5 * 60 * 1000; 
const newsCache: Record<string, { data: any[], timestamp: number }> = {};

async function fetchRSS(symbol: string) {
  const feeds = [
    { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph' },
    { url: 'https://decrypt.co/feed', source: 'Decrypt' }
  ];
  
  const results = await Promise.all(feeds.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items
        .filter(item => 
          item.title?.toLowerCase().includes(symbol.toLowerCase()) || 
          item.contentSnippet?.toLowerCase().includes(symbol.toLowerCase())
        )
        .map(item => ({
          id: item.guid || item.link,
          title: item.title,
          url: item.link,
          source: feed.source,
          publishedAt: item.pubDate,
          sentiment: 'neutral'
        }));
    } catch (e) {
      return [];
    }
  }));
  return results.flat();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  if (newsCache[upperSymbol] && (Date.now() - newsCache[upperSymbol].timestamp < CACHE_TTL)) {
    return NextResponse.json({ news: newsCache[upperSymbol].data, source: 'cache' });
  }

  try {
    const rssNews = await fetchRSS(upperSymbol);
    const combinedNews = rssNews.length > 0 ? rssNews : [{
        id: 'system-msg',
        title: `Monitoring ${upperSymbol} markets for new updates...`,
        url: '#',
        source: 'System',
        publishedAt: new Date().toISOString(),
        sentiment: 'neutral'
    }];

    newsCache[upperSymbol] = {
      data: combinedNews,
      timestamp: Date.now()
    };

    return NextResponse.json({ news: combinedNews });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to sync news feed' }, { status: 500 });
  }
}
