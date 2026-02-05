'use client';

import { useState, useRef, useEffect } from 'react';

interface ShareButtonProps {
  symbol: string;
  timeframe: string;
  chartType: string;
  indicators: string[];
  onGetScreenshot?: () => string | null;
  className?: string;
}

export default function ShareButton({
  symbol,
  timeframe,
  chartType,
  indicators,
  onGetScreenshot,
  className = '',
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getShareUrl = () => {
    const params = new URLSearchParams({
      asset: symbol,
      tf: timeframe,
      ind: indicators.join(','),
      type: chartType,
    });
    return `${window.location.origin}?${params.toString()}`;
  };

  const getShareText = () => {
    return `📊 Check out ${symbol} on ChartWise - AI-Powered Technical Analysis`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this link:', getShareUrl());
    }
  };

  const handleShareTwitter = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
    setShowMenu(false);
  };

  const handleShareTelegram = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(getShareText());
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
    setShowMenu(false);
  };

  const handleShareReddit = () => {
    const url = encodeURIComponent(getShareUrl());
    const title = encodeURIComponent(`${symbol} Technical Analysis - ChartWise`);
    window.open(`https://reddit.com/submit?url=${url}&title=${title}`, '_blank', 'width=600,height=600');
    setShowMenu(false);
  };

  const handleDownloadImage = () => {
    if (onGetScreenshot) {
      const dataUrl = onGetScreenshot();
      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `chartwise-${symbol}-${timeframe}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
    setShowMenu(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${symbol} Chart - ChartWise`,
          text: getShareText(),
          url: getShareUrl(),
        });
      } catch {
        // User cancelled
      }
    }
    setShowMenu(false);
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="theme-toggle"
        title="Share chart"
        aria-label="Share chart"
        aria-expanded={showMenu}
      >
        🔗
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-card)] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
            >
              <span>{copied ? '✅' : '📋'}</span>
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
              >
                <span>📤</span>
                <span>Share...</span>
              </button>
            )}

            <button
              onClick={handleShareTwitter}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
            >
              <span>🐦</span>
              <span>Share on X / Twitter</span>
            </button>

            <button
              onClick={handleShareTelegram}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
            >
              <span>✈️</span>
              <span>Share on Telegram</span>
            </button>

            <button
              onClick={handleShareReddit}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
            >
              <span>🤖</span>
              <span>Share on Reddit</span>
            </button>

            <div className="border-t border-gray-700 mt-1 pt-1">
              <button
                onClick={handleDownloadImage}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]"
              >
                <span>📷</span>
                <span>Download Chart Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
