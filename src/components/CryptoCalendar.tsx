'use client';

import { useState, useMemo } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date
  type: 'halving' | 'unlock' | 'upgrade' | 'airdrop' | 'launch' | 'regulatory' | 'other';
  description: string;
  impact: 'high' | 'medium' | 'low';
  coins: string[];
}

// Curated crypto events — these are well-known upcoming events
// In production you'd fetch from a crypto calendar API
const CRYPTO_EVENTS: CalendarEvent[] = [
  // Bitcoin
  {
    id: 'btc-halving-2028',
    title: 'Bitcoin Halving',
    date: '2028-04-01',
    type: 'halving',
    description: 'Block reward reduces from 3.125 to 1.5625 BTC. Historically triggers multi-year bull cycles.',
    impact: 'high',
    coins: ['BTC'],
  },
  // Ethereum
  {
    id: 'eth-pectra-2025',
    title: 'Ethereum Pectra Upgrade',
    date: '2025-03-01',
    type: 'upgrade',
    description: 'Prague-Electra upgrade: EIP-7702 account abstraction, blob throughput increase, validator improvements.',
    impact: 'high',
    coins: ['ETH'],
  },
  {
    id: 'eth-verkle-2026',
    title: 'Ethereum Verkle Trees',
    date: '2026-06-01',
    type: 'upgrade',
    description: 'Verkle tree state transition — massive state size reduction, enabling stateless clients.',
    impact: 'high',
    coins: ['ETH'],
  },
  // Solana
  {
    id: 'sol-firedancer-2025',
    title: 'Solana Firedancer Launch',
    date: '2025-06-01',
    type: 'upgrade',
    description: 'Jump Crypto\'s Firedancer validator client goes live. Could dramatically increase throughput.',
    impact: 'high',
    coins: ['SOL'],
  },
  // General events
  {
    id: 'stablecoin-regulation-2025',
    title: 'US Stablecoin Legislation',
    date: '2025-06-01',
    type: 'regulatory',
    description: 'Expected US stablecoin regulatory framework. Major impact on USDT/USDC issuers.',
    impact: 'high',
    coins: ['BTC', 'ETH'],
  },
  {
    id: 'sui-token-unlock-2025',
    title: 'SUI Token Unlock',
    date: '2025-04-01',
    type: 'unlock',
    description: 'Major token unlock event for SUI. Can increase circulating supply significantly.',
    impact: 'medium',
    coins: ['SUI'],
  },
  {
    id: 'xrp-sec-ruling-2025',
    title: 'XRP SEC Case Resolution',
    date: '2025-06-01',
    type: 'regulatory',
    description: 'Final resolution of SEC vs Ripple case expected. Could set precedent for crypto regulation.',
    impact: 'high',
    coins: ['XRP'],
  },
  {
    id: 'eth-etf-staking-2025',
    title: 'ETH ETF Staking Approval',
    date: '2025-05-01',
    type: 'regulatory',
    description: 'Potential approval of staking within ETH spot ETFs. Would increase ETH demand significantly.',
    impact: 'high',
    coins: ['ETH'],
  },
  {
    id: 'sol-etf-2025',
    title: 'SOL ETF Decision',
    date: '2025-10-01',
    type: 'regulatory',
    description: 'SEC decision on Solana spot ETF applications. Would be third crypto spot ETF after BTC and ETH.',
    impact: 'high',
    coins: ['SOL'],
  },
];

const EVENT_TYPES: Record<CalendarEvent['type'], { emoji: string; label: string; color: string }> = {
  halving: { emoji: '⛏️', label: 'Halving', color: 'text-yellow-400' },
  unlock: { emoji: '🔓', label: 'Token Unlock', color: 'text-orange-400' },
  upgrade: { emoji: '⬆️', label: 'Upgrade', color: 'text-blue-400' },
  airdrop: { emoji: '🎁', label: 'Airdrop', color: 'text-green-400' },
  launch: { emoji: '🚀', label: 'Launch', color: 'text-purple-400' },
  regulatory: { emoji: '⚖️', label: 'Regulatory', color: 'text-red-400' },
  other: { emoji: '📅', label: 'Other', color: 'text-gray-400' },
};

const IMPACT_COLORS: Record<CalendarEvent['impact'], string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function CryptoCalendar({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<CalendarEvent['type'] | 'all'>('all');
  const [filterCoin, setFilterCoin] = useState<string>('all');

  const filteredEvents = useMemo(() => {
    return CRYPTO_EVENTS
      .filter(e => {
        if (filterType !== 'all' && e.type !== filterType) return false;
        if (filterCoin !== 'all' && !e.coins.includes(filterCoin)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filterType, filterCoin]);

  const allCoins = useMemo(() => {
    const set = new Set<string>();
    CRYPTO_EVENTS.forEach(e => e.coins.forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, []);

  const nextEvent = filteredEvents.find(e => daysUntil(e.date) > 0);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="font-semibold text-[var(--text-primary)]">Crypto Calendar</h3>
          <span className="text-xs text-[var(--text-secondary)]">Key Events & Catalysts</span>
        </div>
        <div className="flex items-center gap-2">
          {nextEvent && (
            <span className="text-xs text-blue-400">
              Next: {nextEvent.title} ({daysUntil(nextEvent.date)}d)
            </span>
          )}
          <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2 py-1 rounded text-xs ${filterType === 'all' ? 'bg-blue-500 text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
              >
                All Types
              </button>
              {Object.entries(EVENT_TYPES).map(([type, info]) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type as CalendarEvent['type'])}
                  className={`px-2 py-1 rounded text-xs ${filterType === type ? 'bg-blue-500 text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                >
                  {info.emoji} {info.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setFilterCoin('all')}
                className={`px-2 py-1 rounded text-xs ${filterCoin === 'all' ? 'bg-green-500 text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
              >
                All Coins
              </button>
              {allCoins.map(coin => (
                <button
                  key={coin}
                  onClick={() => setFilterCoin(coin)}
                  className={`px-2 py-1 rounded text-xs ${filterCoin === coin ? 'bg-green-500 text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'}`}
                >
                  {coin}
                </button>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredEvents.map(event => {
              const days = daysUntil(event.date);
              const isPast = days < 0;
              const typeInfo = EVENT_TYPES[event.type];

              return (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${
                    isPast ? 'opacity-50 border-gray-700/30' : 'border-gray-700/50 hover:border-gray-600'
                  } bg-[var(--bg-hover)]`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={typeInfo.color}>{typeInfo.emoji}</span>
                      <div>
                        <h4 className="font-medium text-sm text-[var(--text-primary)]">{event.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[var(--text-secondary)]">{formatDate(event.date)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${IMPACT_COLORS[event.impact]}`}>
                            {event.impact.toUpperCase()}
                          </span>
                          {event.coins.map(c => (
                            <span key={c} className="text-xs bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${isPast ? 'text-gray-500' : days <= 30 ? 'text-yellow-400' : 'text-[var(--text-secondary)]'}`}>
                      {isPast ? 'PAST' : days === 0 ? 'TODAY' : `${days}d`}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">{event.description}</p>
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="text-center text-[var(--text-secondary)] py-4">No events match filters</div>
            )}
          </div>

          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded p-2">
            📅 Curated list of major crypto events. Dates are approximate. Always verify with official sources.
          </div>
        </div>
      )}
    </div>
  );
}
