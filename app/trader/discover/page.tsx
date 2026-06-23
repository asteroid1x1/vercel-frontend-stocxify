"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/stoxify-icon";
import type { PlanBatch } from "@/lib/types/analyst";

type Plan = {
  plan_id: string;
  analyst_id: string;
  analyst_name: string;
  name: string;
  description?: string;
  days: number;
  price: number;
  segment?: string;
  segments?: string[];
  horizons?: string[];
  risk_level?: string;
  features?: string[];
  batches?: PlanBatch[];
  subscriber_count?: number;
  is_active: boolean;
};

const SEGMENTS = ["ALL", "EQUITY", "FNO", "COMMODITY", "CURRENCY"] as const;

const gradients = [
  "linear-gradient(135deg, #3B82F6 0%, #2D5BE3 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
  "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
  "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
];

function getGradient(id?: string): string {
  const safeId = id || "default";
  let hash = 0;
  for (let i = 0; i < safeId.length; i++) {
    hash = safeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStartingPrice(plan: Plan) {
  if (plan.batches && plan.batches.length > 0) {
    const prices = plan.batches.map(b => b.discounted_price || b.price);
    return Math.min(...prices);
  }
  return plan.price;
}

function PlanCard({ plan }: { plan: Plan }) {
  const startingPrice = getStartingPrice(plan);
  const displaySegments = plan.segments && plan.segments.length > 0 ? plan.segments : (plan.segment ? [plan.segment] : []);
  
  const getRiskStyles = (risk: string) => {
    if (risk === "HIGH") return "text-red-700 bg-red-50 border-red-200";
    if (risk === "LOW") return "text-emerald-700 bg-emerald-50 border-emerald-200";
    return "text-orange-700 bg-orange-50 border-orange-200";
  };

  return (
    <article className="group flex flex-col rounded-2xl border border-[var(--line)] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:border-blue-200">
      
      {/* Top Header: Avatar + Analyst Name + Segments */}
      <div className="flex items-start gap-4 mb-5">
        <div
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl text-[15px] font-black text-white shadow-sm"
          style={{ background: getGradient(plan.analyst_id) }}
        >
          {getInitials(plan.analyst_name)}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-bold tracking-tight text-[var(--ink)] truncate">
              {plan.analyst_name || "Unknown Analyst"}
            </h3>
            {/* Minimal Verification checkmark could go here if added in future */}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {displaySegments.slice(0, 3).map(seg => (
              <span key={seg} className="inline-flex items-center text-[11px] font-bold text-[var(--muted)]">
                {seg}
                <span className="ml-1.5 text-[var(--line-2)] last:hidden">•</span>
              </span>
            ))}
            {displaySegments.length > 3 && (
              <span className="inline-flex items-center text-[11px] font-bold text-[var(--muted)]">
                +{displaySegments.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Title & Description */}
      <div className="mb-5">
        <h4 className="text-[17px] font-black text-[var(--ink)] mb-1.5 leading-tight group-hover:text-blue-600 transition-colors">
          {plan.name}
        </h4>
        {plan.description && (
          <p className="text-[13px] font-medium leading-relaxed text-[var(--muted-2)] line-clamp-2">
            {plan.description}
          </p>
        )}
      </div>

      {/* Info Badges Row */}
      <div className="flex flex-wrap gap-2 mb-5">
        {plan.risk_level && (
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 ${getRiskStyles(plan.risk_level)}`}>
            <Icon name="shieldCheck" className="h-3 w-3" />
            <span className="text-[11px] font-extrabold tracking-wide">{plan.risk_level} RISK</span>
          </div>
        )}
        
        {plan.horizons && plan.horizons.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
            <Icon name="timer" className="h-3 w-3" />
            <span className="text-[11px] font-bold tracking-wide">
              {plan.horizons.slice(0, 2).join(", ")}
              {plan.horizons.length > 2 && " ..."}
            </span>
          </div>
        )}
      </div>

      {/* Tiers Summary */}
      <div className="mb-5 flex-1 flex flex-col gap-2">
        <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Available Plans</span>
        {plan.batches && plan.batches.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {plan.batches.slice(0, 3).map(batch => (
              <div key={batch.batch_id} className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
                <span className="text-[13px] font-semibold text-[var(--ink)]">{batch.name}</span>
                <div className="flex items-center gap-2">
                  {batch.discounted_price && (
                    <span className="text-[11px] font-semibold line-through text-slate-400">₹{batch.price}</span>
                  )}
                  <span className="text-[13px] font-black text-slate-800">₹{batch.discounted_price || batch.price}</span>
                </div>
              </div>
            ))}
            {plan.batches.length > 3 && (
              <div className="text-[11px] font-semibold text-blue-600 mt-1">
                +{plan.batches.length - 3} more options
              </div>
            )}
          </div>
        ) : (
          <div className="text-[13px] font-semibold text-slate-500 italic">
            Standard pricing available.
          </div>
        )}
      </div>

      {/* Footer / CTA */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--line)]">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Starting From</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] font-black text-[var(--ink)] tracking-tight">
              {formatPrice(startingPrice)}
            </span>
          </div>
        </div>
        <Link
          href={`/trader/analyst/${plan.analyst_id}`}
          className="flex items-center gap-2 rounded-xl bg-[var(--ink)] px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-black hover:shadow-md active:scale-95"
        >
          View Plans
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function SkeletonPlanCard() {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-6 animate-pulse flex flex-col h-full">
      <div className="flex items-start gap-4 mb-5">
        <div className="h-[46px] w-[46px] rounded-xl bg-[var(--line)]" />
        <div className="flex-1 pt-1">
          <div className="h-4 w-28 rounded bg-[var(--line)] mb-2.5" />
          <div className="h-2.5 w-20 rounded bg-[var(--line)]" />
        </div>
      </div>
      <div className="h-5 w-3/4 rounded bg-[var(--line)] mb-2" />
      <div className="h-3 w-full rounded bg-[var(--line)] mb-1" />
      <div className="h-3 w-2/3 rounded bg-[var(--line)] mb-5" />
      <div className="flex gap-2 mb-5">
        <div className="h-6 w-20 rounded-lg bg-[var(--line)]" />
        <div className="h-6 w-24 rounded-lg bg-[var(--line)]" />
      </div>
      <div className="space-y-3 mb-6 flex-1">
        <div className="h-3 w-16 rounded bg-[var(--line)] mb-4" />
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded bg-[var(--line)]" />
          <div className="h-4 w-16 rounded bg-[var(--line)]" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 rounded bg-[var(--line)]" />
          <div className="h-4 w-16 rounded bg-[var(--line)]" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-[var(--line)] mt-auto">
        <div className="space-y-1.5">
          <div className="h-2.5 w-16 rounded bg-[var(--line)]" />
          <div className="h-5 w-24 rounded bg-[var(--line)]" />
        </div>
        <div className="h-10 w-28 rounded-xl bg-[var(--line)]" />
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ is_active: "true", limit: "50" });
      if (segment !== "ALL") params.set("segment", segment);
      const res = await fetch(`/api/trader/plans?${params.toString()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      setPlans(data.plans ?? data.data ?? []);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [segment]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = search
    ? plans.filter(
        (p) =>
          p.analyst_name.toLowerCase().includes(search.toLowerCase()) ||
          p.name.toLowerCase().includes(search.toLowerCase())
      )
    : plans;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="px-6 py-8 lg:px-8 lg:py-10 max-w-[1200px] mx-auto">
        
        {/* Header */}
        <div className="mb-8 max-w-2xl">
          <h1 className="text-[28px] font-black tracking-tight text-[var(--ink)] mb-2">
            Discover Analysts
          </h1>
          <p className="text-[14px] text-[var(--muted)] font-medium leading-relaxed">
            Browse top SEBI-registered Research Analysts. Compare strategies, analyze risk levels, and subscribe to premium advisory plans that fit your trading style.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Segment Pills */}
          <div className="flex rounded-xl border border-[var(--line)] bg-white p-1 overflow-x-auto hide-scrollbar shadow-sm">
            {SEGMENTS.map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSegment(seg)}
                className={[
                  "rounded-lg px-4 py-2 text-[13px] font-bold transition-all whitespace-nowrap",
                  segment === seg
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-slate-50",
                ].join(" ")}
              >
                {seg === "FNO"
                  ? "F&O"
                  : seg === "ALL"
                    ? "All"
                    : seg.charAt(0) + seg.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-[320px]">
            <Icon
              name="search"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search analysts or plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-white py-2.5 pl-10 pr-4 text-[13px] font-medium text-[var(--ink)] placeholder:text-slate-400 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonPlanCard />
            <SkeletonPlanCard />
            <SkeletonPlanCard />
            <SkeletonPlanCard />
            <SkeletonPlanCard />
            <SkeletonPlanCard />
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-[var(--line)] bg-white shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Icon name="search" className="h-6 w-6" />
            </div>
            <h3 className="text-[17px] font-bold text-[var(--ink)] mb-1.5">
              {search ? "No matching analysts" : "No analysts available"}
            </h3>
            <p className="text-[14px] text-[var(--muted)] font-medium max-w-[320px]">
              {search
                ? "Try a different search term or clear your segment filters."
                : "New SEBI-registered analysts are being onboarded. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {filteredPlans.map((plan) => (
              <PlanCard key={plan.plan_id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
