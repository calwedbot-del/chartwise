'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

interface Protocol {
  name: string;
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  category: string;
  chain: string;
  logo: string;
  symbol: string;
}

interface ChainTVL {
  name: string;
  tvl: number;
}

interface YieldPool {
  pool: string;
  project: string;
  chain: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
}

type TabType = 'protocols' | 'chains' | 'yields';

const DEFI_CATEGORIES = ['All', 'Liquid Staking', 'Lending', 'DEX', 'Bridge', 'CDP', 'Derivatives', 'Yield'];

async function fetchTopProtocols(): Promise<Protocol[]> {
  try {
    const res = await fetch('https://api.llama.fi/protocols');
    if (!res.ok) return [];
    const data = await res.json();
    
    return data
      .filter((p: any) => p.tvl > 0 && p.category !== 'CEX')
      .slice(0, 100)
      .map((p: any) => ({
        name: p.name,
        tvl: p.tvl || 0,
        change_1d: p.change_1d ?? null,
        change_7d: p.change_7d ?? null,
        category: p.category || 'Unknown',
        chain: p.chain || 'Multi-Chain',
        logo: p.logo || '',
        symbol: p.symbol || '-',
      }));
  } catch {
    return [];
  }
}

async function fetchChainsTVL(): Promise<ChainTVL[]> {
  try {
    const res = await fetch('https://api.llama.fi/v2/chains');
    if (!res.ok) return [];
    const data = await res.json();
    
    return data
      .filter((c: any) => c.tvl > 0)
      .sort((a: any, b: any) => b.tvl - a.tvl)
      .slice(0, 30)
      .map((c: any) => ({
        name: c.name,
        tvl: c.tvl,
      }));
  } catch {
    return [];
  }
}

async function fetchTopYields(): Promise<YieldPool[]> {
  try {
    const res = await fetch('https://yields.llama.fi/pools');
    if (!res.ok) return [];
    const data = await res.json();
    
    return (data.data || [])
      .filter((p: any) => p.tvlUsd > 1000000 && p.apy !== null && p.apy > 0 && p.apy < 500)
      .sort((a: any, b: any) => b.tvlUsd - a.tvlUsd)
      .slice(0, 50)
      .map((p: any) => ({
        pool: p.pool,
        project: p.project || 'Unknown',
        chain: p.chain || 'Unknown',
        symbol: p.symbol || '-',
        tvlUsd: p.tvlUsd || 0,
        apy: p.apy ?? null,
        apyBase: p.apyBase ?? null,
        apyReward: p.apyReward ?? null,
      }));
  } catch {
    return [];
  }
}

function formatTVL(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function DeFiDashboard() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [chains, setChains] = useState<ChainTVL[]>([]);
  const [yields, setYields] = useState<YieldPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('protocols');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [yieldSort, setYieldSort] = useState<'tvl' | 'apy'>('tvl');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const [protocolData, chainData, yieldData] = await Promise.all([
        fetchTopProtocols(),
        fetchChainsTVL(),
        fetchTopYields(),
      ]);
      if (cancelled) return;
      setProtocols(protocolData);
      setChains(chainData);
      setYields(yieldData);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [isOpen]);

  const filteredProtocols = useMemo(() => {
    if (categoryFilter === 'All') return protocols;
    return protocols.filter(p => p.category === categoryFilter);
  }, [protocols, categoryFilter]);

  const totalTVL = useMemo(() => {
    return chains.reduce((sum, c) => sum + c.tvl, 0);
  }, [chains]);

  const sortedYields = useMemo(() => {
    const sorted = [...yields];
    if (yieldSort === 'apy') {
      sorted.sort((a, b) => (b.apy || 0) - (a.apy || 0));
    }
    return sorted;
  }, [yields, yieldSort]);

  const maxChainTVL = useMemo(() => {
    return chains.length > 0 ? chains[0].tvl : 1;
  }, [chains]);

  return (
    <div className="bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏦</span>
          <h3 className="font-semibold text-[var(--text-primary)]">DeFi Dashboard</h3>
          <span className="text-xs text-[var(--text-secondary)]">TVL, Yields & Protocols</span>
        </div>
        <div className="flex items-center gap-2">
          {totalTVL > 0 && (
            <span className="text-sm font-medium text-blue-400">Total: {formatTVL(totalTVL)}</span>
          )}
          <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-700 pb-2">
            {(['protocols', 'chains', 'yields'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-t text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-400'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab === 'protocols' ? '📋 Top Protocols' : tab === 'chains' ? '⛓️ Chains' : '💰 Yields'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-[var(--text-secondary)] py-8">Loading DeFi data...</div>
          ) : (
            <>
              {/* Protocols Tab */}
              {activeTab === 'protocols' && (
                <div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {DEFI_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          categoryFilter === cat
                            ? 'bg-blue-500 text-white'
                            : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-gray-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[var(--bg-card)]">
                        <tr className="text-[var(--text-secondary)] text-xs">
                          <th className="text-left py-2 pr-2">#</th>
                          <th className="text-left py-2">Protocol</th>
                          <th className="text-right py-2">TVL</th>
                          <th className="text-right py-2">1d</th>
                          <th className="text-right py-2">7d</th>
                          <th className="text-left py-2 pl-2">Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProtocols.map((p, i) => (
                          <tr key={p.name} className="border-t border-gray-700/30 hover:bg-[var(--bg-hover)]">
                            <td className="py-1.5 pr-2 text-[var(--text-secondary)]">{i + 1}</td>
                            <td className="py-1.5 font-medium text-[var(--text-primary)]">{p.name}</td>
                            <td className="py-1.5 text-right font-mono">{formatTVL(p.tvl)}</td>
                            <td className={`py-1.5 text-right ${
                              p.change_1d !== null ? (p.change_1d >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'
                            }`}>
                              {p.change_1d !== null ? `${p.change_1d >= 0 ? '+' : ''}${p.change_1d.toFixed(1)}%` : '—'}
                            </td>
                            <td className={`py-1.5 text-right ${
                              p.change_7d !== null ? (p.change_7d >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'
                            }`}>
                              {p.change_7d !== null ? `${p.change_7d >= 0 ? '+' : ''}${p.change_7d.toFixed(1)}%` : '—'}
                            </td>
                            <td className="py-1.5 pl-2 text-xs text-[var(--text-secondary)]">{p.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredProtocols.length === 0 && (
                      <div className="text-center text-[var(--text-secondary)] py-4">No protocols in this category</div>
                    )}
                  </div>
                </div>
              )}

              {/* Chains Tab */}
              {activeTab === 'chains' && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {chains.map((chain, i) => (
                    <div key={chain.name} className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-secondary)] w-6">{i + 1}</span>
                      <span className="text-sm font-medium w-24 truncate">{chain.name}</span>
                      <div className="flex-1 relative h-6 bg-[var(--bg-hover)] rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500/30 rounded transition-all"
                          style={{ width: `${(chain.tvl / maxChainTVL) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-mono">
                          {formatTVL(chain.tvl)}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] w-12 text-right">
                        {totalTVL > 0 ? `${((chain.tvl / totalTVL) * 100).toFixed(1)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Yields Tab */}
              {activeTab === 'yields' && (
                <div>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setYieldSort('tvl')}
                      className={`px-2 py-1 rounded text-xs ${
                        yieldSort === 'tvl' ? 'bg-blue-500 text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Sort by TVL
                    </button>
                    <button
                      onClick={() => setYieldSort('apy')}
                      className={`px-2 py-1 rounded text-xs ${
                        yieldSort === 'apy' ? 'bg-blue-500 text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}
                    >
                      Sort by APY
                    </button>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[var(--bg-card)]">
                        <tr className="text-[var(--text-secondary)] text-xs">
                          <th className="text-left py-2">Protocol</th>
                          <th className="text-left py-2">Pool</th>
                          <th className="text-left py-2">Chain</th>
                          <th className="text-right py-2">TVL</th>
                          <th className="text-right py-2">APY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedYields.map(pool => (
                          <tr key={pool.pool} className="border-t border-gray-700/30 hover:bg-[var(--bg-hover)]">
                            <td className="py-1.5 font-medium">{pool.project}</td>
                            <td className="py-1.5 text-[var(--text-secondary)]">{pool.symbol}</td>
                            <td className="py-1.5 text-xs">{pool.chain}</td>
                            <td className="py-1.5 text-right font-mono">{formatTVL(pool.tvlUsd)}</td>
                            <td className={`py-1.5 text-right font-bold ${
                              (pool.apy || 0) >= 10 ? 'text-green-400' :
                              (pool.apy || 0) >= 5 ? 'text-yellow-400' : 'text-[var(--text-secondary)]'
                            }`}>
                              {pool.apy !== null ? `${pool.apy.toFixed(2)}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded p-2">
            Data from <strong>DeFiLlama</strong> — The largest TVL aggregator in DeFi. Updated every 15 minutes.
          </div>
        </div>
      )}
    </div>
  );
}
