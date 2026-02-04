'use client';

import { useState, useMemo } from 'react';

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  impact: 'high' | 'medium' | 'low';
  category: 'fed' | 'earnings' | 'crypto' | 'economic' | 'other';
  description?: string;
  previous?: string;
  forecast?: string;
  actual?: string;
}

// Static calendar data - updated periodically
// In production this would come from an API like Forex Factory or TradingEconomics
function generateUpcomingEvents(): EconomicEvent[] {
  const now = new Date();
  const events: EconomicEvent[] = [];
  
  // Generate recurring monthly/weekly events relative to current date
  const addEvent = (
    daysFromNow: number,
    title: string,
    impact: EconomicEvent['impact'],
    category: EconomicEvent['category'],
    time: string = '08:30',
    description?: string
  ) => {
    const date = new Date(now);
    date.setDate(date.getDate() + daysFromNow);
    events.push({
      id: `${title}-${daysFromNow}`,
      date: date.toISOString().split('T')[0],
      time,
      title,
      impact,
      category,
      description,
    });
  };

  // Fed and monetary policy events
  addEvent(2, 'FOMC Meeting Minutes', 'high', 'fed', '14:00', 'Federal Reserve meeting minutes release');
  addEvent(5, 'Fed Chair Speech', 'high', 'fed', '10:00', 'Federal Reserve Chair public remarks');
  addEvent(12, 'FOMC Interest Rate Decision', 'high', 'fed', '14:00', 'Federal funds rate decision');
  addEvent(15, 'Fed Balance Sheet Report', 'medium', 'fed', '16:30');

  // Economic data releases
  addEvent(1, 'US CPI (Consumer Price Index)', 'high', 'economic', '08:30', 'Monthly inflation data');
  addEvent(3, 'US PPI (Producer Price Index)', 'medium', 'economic', '08:30');
  addEvent(4, 'Initial Jobless Claims', 'medium', 'economic', '08:30', 'Weekly unemployment claims');
  addEvent(7, 'US Retail Sales', 'high', 'economic', '08:30', 'Monthly consumer spending data');
  addEvent(8, 'US GDP (Preliminary)', 'high', 'economic', '08:30', 'Quarterly GDP estimate');
  addEvent(10, 'Non-Farm Payrolls', 'high', 'economic', '08:30', 'Monthly jobs report');
  addEvent(11, 'US Unemployment Rate', 'high', 'economic', '08:30');
  addEvent(14, 'ISM Manufacturing PMI', 'medium', 'economic', '10:00');
  addEvent(16, 'Consumer Confidence Index', 'medium', 'economic', '10:00');
  addEvent(18, 'US Housing Starts', 'low', 'economic', '08:30');
  addEvent(20, 'Durable Goods Orders', 'medium', 'economic', '08:30');
  addEvent(25, 'PCE Price Index', 'high', 'economic', '08:30', 'Fed preferred inflation measure');

  // Big tech earnings (approximate quarterly)
  addEvent(6, 'AAPL Earnings Report', 'high', 'earnings', '16:30', 'Apple Q4 earnings');
  addEvent(7, 'GOOGL Earnings Report', 'high', 'earnings', '16:00', 'Alphabet Q4 earnings');
  addEvent(8, 'MSFT Earnings Report', 'high', 'earnings', '16:00', 'Microsoft Q4 earnings');
  addEvent(9, 'META Earnings Report', 'high', 'earnings', '16:00', 'Meta Platforms Q4 earnings');
  addEvent(13, 'AMZN Earnings Report', 'high', 'earnings', '16:00', 'Amazon Q4 earnings');
  addEvent(21, 'NVDA Earnings Report', 'high', 'earnings', '16:00', 'NVIDIA quarterly earnings');
  addEvent(24, 'TSLA Earnings Report', 'medium', 'earnings', '16:00', 'Tesla quarterly earnings');

  // Crypto events
  addEvent(3, 'Bitcoin Options Expiry', 'medium', 'crypto', '08:00', 'Monthly BTC options expiration');
  addEvent(9, 'Ethereum Network Upgrade', 'high', 'crypto', '12:00', 'Planned network upgrade');
  addEvent(17, 'Bitcoin Futures Rollover', 'medium', 'crypto', '16:00', 'CME Bitcoin futures rollover');
  addEvent(22, 'Crypto Regulatory Hearing', 'high', 'crypto', '10:00', 'Congressional hearing on crypto regulation');

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

const IMPACT_COLORS = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const IMPACT_LABELS = {
  high: '🔴 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
};

const CATEGORY_ICONS: Record<string, string> = {
  fed: '🏛️',
  earnings: '📊',
  crypto: '₿',
  economic: '📈',
  other: '📌',
};

export default function EconomicCalendar() {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const events = useMemo(() => generateUpcomingEvents(), []);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (categoryFilter !== 'all' && event.category !== categoryFilter) return false;
      if (impactFilter !== 'all' && event.impact !== impactFilter) return false;
      return true;
    });
  }, [events, categoryFilter, impactFilter]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, EconomicEvent[]> = {};
    filteredEvents.forEach(event => {
      if (!groups[event.date]) groups[event.date] = [];
      groups[event.date].push(event);
    });
    return groups;
  }, [filteredEvents]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = dateStr === now.toISOString().split('T')[0];
    const isTomorrow = dateStr === tomorrow.toISOString().split('T')[0];

    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (isToday) return `📅 Today — ${monthDay}`;
    if (isTomorrow) return `📅 Tomorrow — ${monthDay}`;
    return `${dayName}, ${monthDay}`;
  };

  const getDaysUntil = (dateStr: string) => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] rounded-lg text-sm font-medium text-[var(--text-primary)] transition-colors border border-[var(--border)]"
      >
        <span>📅</span>
        <span>Economic Calendar</span>
        {events.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
            {events.length}
          </span>
        )}
        <span className="text-[var(--text-secondary)]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Header with filters */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                📅 Upcoming Economic Events
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">
                {filteredEvents.length} events in the next 30 days
              </span>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">Category:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'fed', label: '🏛️ Fed' },
                  { id: 'earnings', label: '📊 Earnings' },
                  { id: 'crypto', label: '₿ Crypto' },
                  { id: 'economic', label: '📈 Economic' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      categoryFilter === cat.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">Impact:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'high', label: '🔴 High' },
                  { id: 'medium', label: '🟡 Medium' },
                  { id: 'low', label: '🟢 Low' },
                ].map(imp => (
                  <button
                    key={imp.id}
                    onClick={() => setImpactFilter(imp.id)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      impactFilter === imp.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {imp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="max-h-[500px] overflow-y-auto">
            {Object.entries(groupedEvents).length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                No events match your filters
              </div>
            ) : (
              Object.entries(groupedEvents).map(([date, dayEvents]) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="px-4 py-2 bg-[var(--bg-hover)] border-b border-[var(--border)] sticky top-0">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {formatDate(date)}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] ml-2">
                      {getDaysUntil(date)}
                    </span>
                  </div>

                  {/* Events for this date */}
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg-hover)] cursor-pointer transition-colors"
                      onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Impact indicator */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${IMPACT_COLORS[event.impact]}`} />
                        
                        {/* Time */}
                        <span className="text-xs text-[var(--text-secondary)] w-12 flex-shrink-0 font-mono">
                          {event.time}
                        </span>

                        {/* Category icon */}
                        <span className="text-sm flex-shrink-0">
                          {CATEGORY_ICONS[event.category]}
                        </span>

                        {/* Title */}
                        <span className="text-sm font-medium text-[var(--text-primary)] flex-1">
                          {event.title}
                        </span>

                        {/* Impact badge */}
                        <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                          event.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                          event.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {event.impact}
                        </span>
                      </div>

                      {/* Expanded details */}
                      {expandedEvent === event.id && event.description && (
                        <div className="mt-2 ml-8 text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded p-2">
                          {event.description}
                          {(event.previous || event.forecast) && (
                            <div className="mt-2 flex gap-4">
                              {event.previous && (
                                <span>Previous: <span className="text-[var(--text-primary)]">{event.previous}</span></span>
                              )}
                              {event.forecast && (
                                <span>Forecast: <span className="text-blue-400">{event.forecast}</span></span>
                              )}
                              {event.actual && (
                                <span>Actual: <span className="text-green-400 font-medium">{event.actual}</span></span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-[var(--border)] text-center">
            <span className="text-xs text-[var(--text-secondary)]">
              ⚠️ Event dates are approximate. Verify with official sources before making trading decisions.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
