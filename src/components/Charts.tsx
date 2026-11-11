"use client";

import { fcfa, fcfaCompact } from "@/lib/format";

export function RevenueChart({
  data,
  height = 190,
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1.5 sm:gap-2.5" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(3, Math.round((d.value / max) * 100));
          return (
            <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className={`relative w-full rounded-t-lg transition-all duration-300 ${
                    d.highlight
                      ? "bg-emerald-600"
                      : "bg-emerald-200 group-hover:bg-emerald-400"
                  }`}
                  style={{ height: `${h}%` }}
                  title={fcfa(d.value)}
                >
                  <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    {fcfaCompact(d.value)}
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-medium ${d.highlight ? "text-emerald-700" : "text-neutral-400"}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PaymentMix({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        {total === 0 ? null : (
          data.map((d, i) =>
            d.value > 0 ? (
              <div
                key={i}
                className={d.color}
                style={{ width: `${(d.value / total) * 100}%` }}
                title={`${d.label} — ${fcfa(d.value)}`}
              />
            ) : null,
          )
        )}
      </div>
      <div className="mt-4 space-y-2.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
            <span className="flex-1 text-xs font-medium text-neutral-600">{d.label}</span>
            <span className="text-xs font-semibold text-neutral-900">{fcfaCompact(d.value)}</span>
            <span className="w-9 text-right text-[11px] text-neutral-400">
              {total === 0 ? 0 : Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
