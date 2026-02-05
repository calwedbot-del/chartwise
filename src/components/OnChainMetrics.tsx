'use client';

import { useState, useEffect, useMemo } from 'react';

interface BTCChainStats {
  market_price_usd: number;
  hash_rate: number;
  n_tx: number;
  n_blocks_mined: number;
  minutes_between_blocks: number;
  total_fees_btc: number;
  n_btc_mined: number;
  difficulty: number;
  estimated_transaction_volume_usd: number;
  trade_volume_usd: number;
  totalbc: number;
}

interface ETHGasData {
  safeGasPrice: number;
  proposeGasPrice: number;
  fastGasPrice: number;
}

async function fetchBTCStats(): Promise<BTCChainStats | null> {
  try {
    const res = await fetch('https://api.blockchain.info/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchETHGas(): Promise<ETHGasData | null> {
  try {
    // Use blocknative or similar free endpoint
    const res = await fetch('https://api.blocknative.com/gasprices/blockprices');
    if (!res.ok) return null;
    const data = await res.json();
    const block = data?.blockPrices?.[0]?.estimatedPrices;
    if (!block || block.length === 0) return null;
    
    return {
      safeGasPrice: block[block.length - 1]?.maxFeePerGas || 0,
      proposeGasPrice: block[Math.floor(block.length / 2)]?.maxFeePerGas || 0,
      fastGasPrice: block[0]?.maxFeePerGas || 0,
    };
  } catch {
    return null;
  }
}

function formatHash(hashRate: number): string {
  if (hashRate >= 1e18) return `${(hashRate / 1e18).toFixed(2)} EH/s`;
  if (hashRate >= 1e15) return `${(hashRate / 1e15).toFixed(2)} PH/s`;
  if (hashRate >= 1e12) return `${(hashRate / 1e12).toFixed(2)} TH/s`;
  return `${(hashRate / 1e9).toFixed(2)} GH/s`;
}

function formatLarge(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function OnChainMetrics({ className = '' }: { className?: string }) {
  const [btcStats, setBtcStats] = useState<BTCChainStats | null>(null);
  const [ethGas, setEthGas] = useState<ETHGasData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const [btc, gas] = await Promise.all([
        fetchBTCStats(),
        fetchETHGas(),
      ]);
      if (cancelled) return;
      setBtcStats(btc);
      setEthGas(gas);
      setLoading(false);
    }

    fetchData();
    const interval = setInterval(fetchData, 120000); // 2 min
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOpen]);

  // Derived metrics
  const btcSupply = useMemo(() => {
    if (!btcStats) return null;
    const total = btcStats.totalbc / 1e8; // satoshis to BTC
    const maxSupply = 21_000_000;
    const minedPct = (total / maxSupply) * 100;
    return { total, maxSupply, minedPct, remaining: maxSupply - total };
  }, [btcStats]);

  return (
    <div className={`bg-[var(--bg-card)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⛓️</span>
          <h3 className="font-semibold text-[var(--text-primary)]">On-Chain Metrics</h3>
          <span className="text-xs text-[var(--text-secondary)]">BTC Network & ETH Gas</span>
        </div>
        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {loading && !btcStats ? (
            <div className="text-center text-[var(--text-secondary)] py-6">Loading on-chain data...</div>
          ) : (
            <>
              {/* BTC Network Stats */}
              {btcStats && (
                <div>
                  <h4 className="text-sm font-medium text-orange-400 mb-2">₿ Bitcoin Network</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-secondary)]">Hash Rate</div>
                      <div className="text-lg font-bold text-orange-400">{formatHash(btcStats.hash_rate)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">Network security</div>
                    </div>
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-secondary)]">24h Transactions</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">{btcStats.n_tx.toLocaleString()}</div>
                      <div className="text-xs text-[var(--text-secondary)]">On-chain activity</div>
                    </div>
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-secondary)]">Block Time</div>
                      <div className="text-lg font-bold text-blue-400">{btcStats.minutes_between_blocks.toFixed(1)} min</div>
                      <div className="text-xs text-[var(--text-secondary)]">Target: 10 min</div>
                    </div>
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-secondary)]">Difficulty</div>
                      <div className="text-lg font-bold text-purple-400">{(btcStats.difficulty / 1e12).toFixed(2)}T</div>
                      <div className="text-xs text-[var(--text-secondary)]">Mining difficulty</div>
                    </div>
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-secondary)]">24h Volume (est.)</div>
                      <div className="text-lg font-bold text-green-400">{formatLarge(btcStats.estimated_transaction_volume_usd)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">On-chain transfer value</div>
                    </div>
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                      <div className="text-xs text-[var(--text-secondary)]">Blocks Mined (24h)</div>
                      <div className="text-lg font-bold text-yellow-400">{btcStats.n_blocks_mined}</div>
                      <div className="text-xs text-[var(--text-secondary)]">Target: ~144/day</div>
                    </div>
                  </div>

                  {/* Supply Progress */}
                  {btcSupply && (
                    <div className="mt-3 bg-[var(--bg-hover)] rounded-lg p-3">
                      <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                        <span>BTC Supply: {btcSupply.total.toLocaleString()} / {btcSupply.maxSupply.toLocaleString()}</span>
                        <span className="text-orange-400">{btcSupply.minedPct.toFixed(2)}% mined</span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"
                          style={{ width: `${btcSupply.minedPct}%` }}
                        />
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {btcSupply.remaining.toLocaleString()} BTC remaining to be mined
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ETH Gas Prices */}
              {ethGas && (
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Ξ Ethereum Gas</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                      <div className="text-xs text-[var(--text-secondary)]">🐢 Safe</div>
                      <div className="text-xl font-bold text-green-400">{ethGas.safeGasPrice.toFixed(0)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">Gwei</div>
                    </div>
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                      <div className="text-xs text-[var(--text-secondary)]">🚗 Standard</div>
                      <div className="text-xl font-bold text-yellow-400">{ethGas.proposeGasPrice.toFixed(0)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">Gwei</div>
                    </div>
                    <div className="bg-[var(--bg-hover)] rounded-lg p-3 text-center">
                      <div className="text-xs text-[var(--text-secondary)]">🚀 Fast</div>
                      <div className="text-xl font-bold text-red-400">{ethGas.fastGasPrice.toFixed(0)}</div>
                      <div className="text-xs text-[var(--text-secondary)]">Gwei</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] rounded p-2">
                <strong>On-chain metrics</strong> reveal network health and adoption. Rising hash rate = more secure network.
                High transaction count = active usage. BTC data from Blockchain.com API.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
