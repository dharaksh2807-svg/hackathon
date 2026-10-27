import React from "react";

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Loading records" className="space-y-3 p-5 bg-white rounded-xl border border-slate-200 animate-pulse">
      <div className="h-4 bg-slate-200 rounded-sm w-1/4"></div>
      <div className="h-8 bg-slate-100 rounded-sm w-1/2"></div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-slate-100 rounded-sm w-full"></div>
      ))}
    </div>
  );
}
