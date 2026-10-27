"use client";

import type { PortalIdentity } from "@/lib/api-client/types";
import { useI18n } from "@/lib/i18n/context";

interface PersonaSwitcherProps {
  currentPersona: PortalIdentity;
  identities: PortalIdentity[];
  onSelectPersona: (persona: PortalIdentity) => void;
  onSignOut: () => void;
}

export function PersonaSwitcher({ currentPersona, identities, onSelectPersona, onSignOut }: PersonaSwitcherProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Current user info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentPersona.avatarInitials}
            </div>
            <div className="min-w-0 break-words">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{currentPersona.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentPersona.role === "WORKER"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-violet-100 text-violet-800"
                }`}>
                  {currentPersona.role === "WORKER" ? t("workerPortal") : t("employerPortal")}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">{currentPersona.organizationName}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center min-w-0 max-w-full">
            {identities.length > 1 && (
              <label className="text-xs">Organization
                <select aria-label="Organization" value={currentPersona.id} onChange={event => {
                  const identity = identities.find(item => item.id === event.target.value);
                  if (identity) onSelectPersona(identity);
                }} className="ml-2 border rounded-lg p-2 max-w-full">
                  {identities.map(identity => <option key={identity.id} value={identity.id}>{identity.organizationName} — {identity.role}</option>)}
                </select>
              </label>
            )}
            <button onClick={onSignOut} className="px-2.5 py-1.5 text-[11px] font-semibold border border-slate-300 rounded-lg hover:bg-slate-50">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
