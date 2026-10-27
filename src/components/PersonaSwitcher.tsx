"use client";

import type { PortalIdentity } from "@/lib/api-client/types";
import { Badge } from "./common/Badge";

interface PersonaSwitcherProps {
  currentPersona: PortalIdentity;
  identities: PortalIdentity[];
  onSelectPersona: (persona: PortalIdentity) => void;
  onSignOut: () => void;
}

export function PersonaSwitcher({ currentPersona, identities, onSelectPersona, onSignOut }: PersonaSwitcherProps) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">{currentPersona.avatarInitials}</div>
          <div className="min-w-0 break-words">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm">{currentPersona.name}</span>
              <Badge variant="neutral" size="sm">{currentPersona.role === "WORKER" ? "Authorized Worker" : "Authorized Employer"}</Badge>
              <Badge variant={currentPersona.sector} size="sm">{currentPersona.sector === "construction" ? "Construction" : "College Facilities"}</Badge>
            </div>
            <p className="text-xs text-slate-500">{currentPersona.organizationName}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center min-w-0 max-w-full">
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
          <button onClick={onSignOut} className="px-3 py-2 text-xs border rounded-lg">Sign out</button>
        </div>
      </div>
    </div>
  );
}
