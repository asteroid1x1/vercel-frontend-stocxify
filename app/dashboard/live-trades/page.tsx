"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { Icon } from "@/components/stoxify-icon";
import {
  useActiveTrades,
  usePendingTrades,
  useClosedTrades,
} from "@/hooks/use-analyst-dashboard";
import { useLiveTradesStats } from "@/hooks/use-analyst-dashboard";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { BroadcastModal } from "@/components/dashboard/broadcast-modal";
import type { Trade } from "@/lib/types/analyst";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "active" | "pending" | "closed";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Mini stat card in the 4-stat strip at top */
function StatStrip({
  label,
  value,
  sub,
  valueClass = "text-[var(--ink)]",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-[var(--line)] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-1 text-[11.5px] font-medium text-[var(--muted)]">{label}</div>
      <div className={`text-[22px] font-extrabold leading-tight tracking-[-0.5px] ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] font-semibold text-[var(--green)]">{sub}</div>}
    </div>
  );
}

/** Skeleton for a stat strip item */
function StatStripSkeleton() {
  return (
    <div className="flex-1 rounded-xl border border-[var(--line)] bg-white px-5 py-4">
      <div className="mb-2 h-2.5 w-28 animate-pulse rounded bg-[var(--line)]" />
      <div className="h-7 w-16 animate-pulse rounded bg-[var(--line)]" />
    </div>
  );
}

/** Full trade card matching the Figma exactly */
function TradeCard({ trade, onBroadcast, hideActions }: { trade: Trade; onBroadcast: (trade: Trade) => void; hideActions?: boolean }) {
  const { openCloseTrade, openModifyTrade, showSuccessToast } = useDashboard();
  
  // Simulated real-time price states
  const [liveLtp, setLiveLtp] = useState(trade.ltp ?? trade.entry_price);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [isNotePublic, setIsNotePublic] = useState(true);

  // Fluctuating LTP logic
  useEffect(() => {
    if (trade.status !== "ACTIVE" && trade.is_live_streaming !== true) {
      return;
    }
    const interval = setInterval(() => {
      setLiveLtp((prevLtp) => {
        const changePct = (Math.random() * 0.12 - 0.06) / 100; // ±0.06% change
        const diff = prevLtp * changePct;
        const nextLtp = Math.round((prevLtp + diff) * 100) / 100;
        if (nextLtp > prevLtp) {
          setPriceDirection("up");
        } else if (nextLtp < prevLtp) {
          setPriceDirection("down");
        }
        setFlashKey((k) => k + 1);
        return nextLtp;
      });
    }, 3500 + Math.random() * 2500);
    return () => clearInterval(interval);
  }, [trade.status, trade.is_live_streaming]);

  useEffect(() => {
    if (priceDirection) {
      const timer = setTimeout(() => {
        setPriceDirection(null);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [priceDirection, flashKey]);

  const isShort = trade.direction === "SHORT" || trade.direction === "SELL";
  const stopLossVal = trade.stop_loss ?? trade.stop_loss_price;
  const targetVal = trade.target ?? trade.target_price;

  // Live PNL calculations based on simulated price
  const livePnlPerUnit = isShort
    ? trade.entry_price - liveLtp
    : liveLtp - trade.entry_price;
  const livePnlPct = (livePnlPerUnit / trade.entry_price) * 100;

  // Near SL/Target conditions
  const isTargetHit = targetVal !== undefined && (!isShort ? liveLtp >= targetVal : liveLtp <= targetVal);
  const isSLHit = stopLossVal !== undefined && (!isShort ? liveLtp <= stopLossVal : liveLtp >= stopLossVal);

  // Timeline Progress Calculation
  const range = (targetVal && stopLossVal) ? Math.abs(targetVal - stopLossVal) : 0;
  const entryPct = (targetVal && stopLossVal && range !== 0) 
    ? Math.min(100, Math.max(0, (!isShort ? ((trade.entry_price - stopLossVal) / range) : ((stopLossVal - trade.entry_price) / range)) * 100)) 
    : 50;
  const livePct = (targetVal && stopLossVal && range !== 0) 
    ? Math.min(100, Math.max(0, (!isShort ? ((liveLtp - stopLossVal) / range) : ((stopLossVal - liveLtp) / range)) * 100)) 
    : 50;

  const handleToggleNote = () => {
    const nextState = !isNotePublic;
    setIsNotePublic(nextState);
    showSuccessToast(
      nextState ? "Note Public" : "Note Hidden",
      `Note visibility for ${trade.symbol} has been ${nextState ? "enabled" : "disabled"} for subscribers.`
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm relative mt-4 overflow-visible flex flex-col">
      {/* Top Badges */}
      <div className="flex justify-between items-start px-4">
        <div className="bg-[#cc9900] text-white px-3 py-1 rounded-b-md rounded-t-sm text-xs font-bold flex items-center gap-1.5 shadow-sm -mt-px">
          <div className="flex gap-0.5 items-end h-3">
            <div className="w-1 bg-white/90 h-full rounded-sm" />
            <div className="w-1 bg-white/90 h-2/3 rounded-sm" />
          </div>
          Analyst Signal
        </div>
        <div className="flex gap-2 -mt-px">
          {trade.trade_subtype && (
            <span className="bg-[#ffcc00] text-gray-900 px-3 py-1 rounded-b-md rounded-t-sm text-xs font-bold shadow-sm">
              {trade.trade_subtype}
            </span>
          )}
          <span className="bg-[#0066ff] text-white px-3 py-1 rounded-b-md rounded-t-sm text-xs font-bold shadow-sm">
            {trade.segment}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1">
        {/* Symbol Row */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center bg-blue-50 text-xl font-bold text-blue-500 overflow-hidden shrink-0 shadow-inner">
              {trade.symbol.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 leading-none">{trade.symbol}</h3>
                <span className="text-[10px] font-bold border border-gray-200 rounded-full px-1.5 py-0.5 text-gray-500 flex items-center gap-1 leading-none shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> NSE
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{trade.segment_label ?? trade.segment}</p>
            </div>
          </div>

          <div className="text-right">
            <div className={`text-xl font-extrabold text-gray-900 transition-colors duration-300 ${priceDirection === 'up' ? 'text-green-600' : priceDirection === 'down' ? 'text-red-600' : ''}`}>
              ₹{liveLtp.toFixed(2)}
            </div>
            <div className={`text-sm font-bold mt-1 ${livePnlPerUnit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              <span>
                {livePnlPerUnit >= 0 ? '+' : '-'}₹{Math.abs(livePnlPerUnit).toFixed(2)} ({livePnlPerUnit >= 0 ? '+' : ''}{livePnlPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Progress Slider / Timeline */}
        <div className="relative h-1 mb-14 mt-6 mx-2">
          {/* Base line */}
          {stopLossVal && targetVal ? (
            <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 h-full bg-red-500" style={{ width: `${entryPct}%` }} />
              <div className="absolute inset-y-0 right-0 h-full bg-green-500" style={{ width: `${100 - entryPct}%`, left: `${entryPct}%` }} />
            </div>
          ) : (
            <div className="absolute inset-0 w-full h-full rounded-full bg-gray-200" />
          )}

          {/* SL Node */}
          {stopLossVal && (
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full shadow-sm" style={{ left: '0%' }}>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[13px] font-bold text-gray-900">SL</div>
            </div>
          )}

          {/* Entry Node */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full shadow-sm" style={{ left: `${entryPct}%` }}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className="text-[13px] font-bold text-gray-900">Entry</span>
              <span className="text-[11px] font-medium text-gray-500 mt-1 whitespace-nowrap">
                {trade.created_at ? new Date(trade.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "—"}
              </span>
              <span className="text-[11px] font-medium text-gray-500 whitespace-nowrap">
                {trade.created_at ? new Date(trade.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }) : ""}
              </span>
            </div>
          </div>

          {/* Target Node */}
          {targetVal && (
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-black rounded-full shadow-sm" style={{ left: '100%' }}>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[13px] font-bold text-gray-900">Target</div>
            </div>
          )}

          {/* Live Price Marker */}
          {stopLossVal && targetVal && (
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-700 ease-in-out" style={{ left: `${livePct}%` }}>
              <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-lg mb-2 absolute bottom-full shadow-md whitespace-nowrap">
                Live
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-red-600 bg-white/40 ring-4 ring-white shadow-sm" />
            </div>
          )}
        </div>

        {/* Stats Row 1: Potential Profit and Status */}
        <div className="bg-[#f8faf9] rounded-xl p-4 flex justify-between border border-gray-100 mb-4 shadow-sm">
          <div>
            <div className="text-[13px] font-medium text-gray-500 mb-1">Potential Profit</div>
            <div className="text-green-600 font-bold text-base">
              {targetVal ? `+${(Math.abs(targetVal - trade.entry_price) / trade.entry_price * 100).toFixed(2)}%` : "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-medium text-gray-500 mb-1">Status</div>
            <div className={`font-bold text-base ${isTargetHit ? 'text-green-600' : isSLHit ? 'text-red-600' : Math.abs(liveLtp - trade.entry_price) / trade.entry_price < 0.005 ? 'text-green-600' : livePnlPerUnit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {isTargetHit ? "Target Hit" : isSLHit ? "SL Hit" : Math.abs(liveLtp - trade.entry_price) / trade.entry_price < 0.005 ? "In Buying Range" : livePnlPerUnit >= 0 ? "In Profit" : "In Loss"}
            </div>
          </div>
        </div>

        {/* Stats Row 2: Entry, SL, Target */}
        <div className="border border-gray-200 rounded-xl p-4 flex justify-between shadow-sm">
          <div className="text-center flex-1">
            <div className="text-[13px] font-medium text-gray-500 mb-1">Entry</div>
            <div className="font-bold text-base text-gray-900">₹{trade.entry_price.toFixed(2)}</div>
          </div>
          <div className="w-px bg-gray-200 mx-2"></div>
          <div className="text-center flex-1">
            <div className="text-[13px] font-medium text-gray-500 mb-1">Stop Loss</div>
            <div className="font-bold text-base text-gray-900">{stopLossVal ? `₹${stopLossVal.toFixed(2)}` : '—'}</div>
          </div>
          <div className="w-px bg-gray-200 mx-2"></div>
          <div className="text-center flex-1">
            <div className="text-[13px] font-medium text-gray-500 mb-1">Target</div>
            <div className="font-bold text-base text-gray-900">{targetVal ? `₹${targetVal.toFixed(2)}` : '—'}</div>
          </div>
        </div>
      </div>

      {/* Card Footer: action buttons */}
      <div className="flex items-center gap-4 border-t border-gray-100 bg-gray-50/50 px-5 py-4 mt-auto max-[860px]:flex-col max-[860px]:items-stretch">
        <div className="flex flex-1 items-center gap-3 text-sm min-w-0">
          <button
            onClick={handleToggleNote}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              isNotePublic
                ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
            }`}
            type="button"
            title={isNotePublic ? "Public note - visible to subscribers" : "Private note - hidden from subscribers"}
          >
            <Icon className="h-4 w-4" name={isNotePublic ? "eye" : "eyeOff"} />
            <span>{isNotePublic ? "Public Note" : "Private Note"}</span>
          </button>
        </div>

        {!hideActions && (
          <div className="flex shrink-0 items-center justify-end gap-2 max-[860px]:justify-between w-full sm:w-auto">
            <button
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
              type="button"
              onClick={() => openModifyTrade(trade)}
            >
              Modify
            </button>
            <button
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-100"
              type="button"
              onClick={() => onBroadcast(trade)}
            >
              Broadcast
            </button>
            <button
              className="rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-700"
              type="button"
              onClick={() => openCloseTrade(trade)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Skeleton for a single trade card while loading */
function TradeCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--line)]">
        <div className="h-4 w-24 animate-pulse rounded bg-[var(--line)]" />
        <div className="h-4 w-12 animate-pulse rounded bg-[var(--line)]" />
        <div className="h-4 w-10 animate-pulse rounded bg-[var(--line)]" />
      </div>
      <div className="grid grid-cols-5 gap-0 px-5 py-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--line)]" />
            <div className="h-5 w-20 animate-pulse rounded bg-[var(--line)]" />
            <div className="h-2.5 w-14 animate-pulse rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 border-t border-[var(--line)] px-5 py-3">
        <div className="h-3 w-64 animate-pulse rounded bg-[var(--line)]" />
        <div className="ml-auto flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-lg bg-[var(--line)]" />
          ))}
        </div>
      </div>
    </div>
  );
}



// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveTradesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("active");
  const [broadcastTrade, setBroadcastTrade] = useState<Trade | null>(null);
  const { openCreateTrade, showSuccessToast } = useDashboard();

  const { stats, isLoading: statsLoading } = useLiveTradesStats();
  const {
    trades: activeTrades,
    isLoading: activeLoading,
    isError: activeError,
  } = useActiveTrades(20);
  const activeTotal = activeTrades.length;
  const { trades: pendingTrades, isLoading: pendingLoading } = usePendingTrades();
  const pendingTotal = pendingTrades.length;
  const { trades: closedTrades, isLoading: closedLoading } = useClosedTrades();

  const TAB_OPTIONS: { id: TabId; label: string; count?: number }[] = [
    { id: "active", label: "Active", count: activeTotal },
    { id: "pending", label: "Pending", count: pendingTotal },
    { id: "closed", label: "Closed Trades" },
  ];

  return (
    <>
      {/* ── Topbar: shows analyst profile avatar on right ── */}
      <Topbar showUserProfile title="Live Trades" />

      {/* ── Page body ── */}
      <div className="flex-1 p-6">
        {/* ── Page header: title + subtitle + Create Trade button ── */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-extrabold tracking-[-0.5px] text-[var(--ink)]">
              Active Trades
            </h2>
            <p className="mt-0.5 text-[13px] text-[var(--muted)]">
              Monitor your open positions and broadcast live updates to subscribers.
            </p>
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-[var(--brand-dark)] hover:shadow-md active:scale-[0.98]"
            onClick={openCreateTrade}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" name="plus" />
            Create Trade
          </button>
        </div>

        {/* ── Stat strip: 4 mini stats ── */}
        <div className="mb-5 flex gap-3 max-[860px]:grid max-[860px]:grid-cols-2">
          {statsLoading || !stats ? (
            <>
              <StatStripSkeleton />
              <StatStripSkeleton />
              <StatStripSkeleton />
              <StatStripSkeleton />
            </>
          ) : (
            <>
              <StatStrip label="Total Active Trades" value={String(stats.total_active)} />
              <StatStrip
                label="Avg. Win Rate (Monthly)"
                value={`${stats.avg_win_rate_monthly}%`}
                sub={`+${stats.win_rate_change_pct}% from last month`}
              />
              <StatStrip
                label="Active Subscribers"
                value={stats.active_subscribers.toLocaleString("en-IN")}
              />
              <StatStrip
                label="Live Viewers"
                value={String(stats.live_viewers)}
                sub="Watching your trades"
                valueClass="text-[var(--green)]"
              />
            </>
          )}
        </div>

        {/* ── Tab bar ── */}
        <div className="mb-5 flex gap-0 border-b border-[var(--line)]">
          {TAB_OPTIONS.map((tab) => (
            <button
              className={`flex items-center gap-1.5 border-b-2 px-4 pb-3 pt-0.5 text-[13.5px] font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === tab.id
                      ? "bg-[var(--brand-light)] text-[var(--brand)]"
                      : "bg-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}

        {/* ACTIVE TAB */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {activeLoading ? (
              <>
                <TradeCardSkeleton />
                <TradeCardSkeleton />
                <TradeCardSkeleton />
              </>
            ) : activeError ? (
              <div className="rounded-xl border border-[var(--red)]/20 bg-[var(--red-light)] p-5 text-[13px] text-[var(--red)]">
                <Icon className="mr-2 h-4 w-4" name="x" />
                Unable to load trades. Make sure the trade service is running at{" "}
                <code className="rounded bg-[var(--red)]/10 px-1">/trades/</code>.
              </div>
            ) : activeTrades.length === 0 ? (
              <div className="rounded-xl border border-[var(--line)] bg-white p-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)]">
                  <Icon className="h-6 w-6 text-[var(--muted-2)]" name="trendingUp" />
                </div>
                <div className="text-[14px] font-semibold text-[var(--ink)]">No active trades</div>
                <p className="mt-1 text-[12.5px] text-[var(--muted-2)]">
                  Create your first trade to start broadcasting to subscribers.
                </p>
              </div>
            ) : (
              activeTrades.map((trade) => (
                <TradeCard key={trade.trade_id} trade={trade} onBroadcast={setBroadcastTrade} />
              ))
            )}
          </div>
        )}

        {/* PENDING TAB */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            {pendingLoading ? (
              <TradeCardSkeleton />
            ) : pendingTrades.length === 0 ? (
              <div className="rounded-xl border border-[var(--line)] bg-white p-12 text-center">
                <div className="text-[14px] font-semibold text-[var(--ink)]">No pending trades</div>
                <p className="mt-1 text-[12.5px] text-[var(--muted-2)]">
                  Draft trades awaiting publication will appear here.
                </p>
              </div>
            ) : (
              pendingTrades.map((trade) => (
                <TradeCard key={trade.trade_id} trade={trade} onBroadcast={setBroadcastTrade} />
              ))
            )}
          </div>
        )}

        {/* CLOSED TRADES TAB */}
        {activeTab === "closed" && (
          <div className="space-y-4">
            {closedLoading ? (
              <>
                <TradeCardSkeleton />
                <TradeCardSkeleton />
                <TradeCardSkeleton />
              </>
            ) : closedTrades.length === 0 ? (
              <div className="rounded-xl border border-[var(--line)] bg-white p-12 text-center">
                <div className="text-[14px] font-semibold text-[var(--ink)]">
                  No closed trades yet
                </div>
                <p className="mt-1 text-[12.5px] text-[var(--muted-2)]">
                  Trades you close will appear here with their outcome.
                </p>
              </div>
            ) : (
              closedTrades.map((trade) => (
                <TradeCard key={trade.trade_id} trade={trade} onBroadcast={setBroadcastTrade} hideActions />
              ))
            )}
          </div>
        )}
      </div>

      {broadcastTrade && (
        <BroadcastModal
          trade={broadcastTrade}
          onClose={() => setBroadcastTrade(null)}
          onSuccess={showSuccessToast}
        />
      )}
    </>
  );
}
