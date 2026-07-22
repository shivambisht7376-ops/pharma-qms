import React from 'react';
import { AuditLogEntry } from '../types';
import { History, ShieldCheck, Clock, User, CheckCircle2, Sparkles } from 'lucide-react';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ auditLogs }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 text-slate-800">
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center space-x-2">
            <History className="w-5 h-5 text-slate-700" />
            <span>GMP Audit Trail & AI Synchronization Logs (21 CFR Part 11)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of AI-assisted field extractions, natural language complaint edits, and user state transitions.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-600">Audit Compliance:</span>
          <span className="font-mono text-emerald-700 font-bold">VERIFIED</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {auditLogs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 italic text-xs">
            No audit log records recorded in current session yet.
          </div>
        ) : (
          auditLogs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5 text-xs transition-colors hover:bg-slate-100/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-900 flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                    <span>{log.user}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-slate-700">{log.action}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{log.timestamp}</span>
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed">{log.details}</p>

              {log.fieldModified && (
                <div className="pt-1 flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400 font-semibold">Modified Field:</span>
                  <span className="font-mono text-slate-800 px-2 py-0.5 rounded bg-white border border-slate-200">
                    {log.fieldModified}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
