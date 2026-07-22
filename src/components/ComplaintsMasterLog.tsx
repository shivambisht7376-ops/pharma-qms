import React, { useState } from 'react';
import { ComplaintData, RiskAssessment } from '../types';
import {
  Search,
  Filter,
  FileText,
  Building2,
  Package,
  Layers,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Pill,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface ComplaintsMasterLogProps {
  complaintsList: { complaint: ComplaintData; risk: RiskAssessment }[];
  onLoadComplaintIntoForm: (complaint: ComplaintData, risk: RiskAssessment) => void;
}

export const ComplaintsMasterLog: React.FC<ComplaintsMasterLogProps> = ({
  complaintsList,
  onLoadComplaintIntoForm,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'ALL' | 'API' | 'FDF'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const filteredList = complaintsList.filter((item) => {
    const c = item.complaint;
    const r = item.risk;

    const matchesSearch =
      c.complaintNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.batchLotNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = productTypeFilter === 'ALL' || c.productType === productTypeFilter;
    const matchesSeverity = severityFilter === 'ALL' || r.severity?.toLowerCase() === severityFilter.toLowerCase();

    return matchesSearch && matchesType && matchesSeverity;
  });

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'major':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'minor':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 text-slate-800">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <span>Complaints Master Log (QMS Database)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of customer complaints across Active Pharmaceutical Ingredients (API) and Finished Dosage Forms (FDF)
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search batch #, customer, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 w-56"
            />
          </div>

          {/* Product Type Filter */}
          <select
            value={productTypeFilter}
            onChange={(e) => setProductTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Categories (API & FDF)</option>
            <option value="API">API Only (Bulk Active)</option>
            <option value="FDF">FDF Only (Finished Form)</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Risk Severities</option>
            <option value="Critical">Critical</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Ref # & Status</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Product & Type</th>
              <th className="py-3 px-4">Batch # & Qty</th>
              <th className="py-3 px-4">Defect & Severity</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                  No complaint records found matching filters.
                </td>
              </tr>
            ) : (
              filteredList.map(({ complaint: c, risk: r }) => (
                <tr key={c.id || c.complaintNumber} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-semibold text-slate-900">{c.complaintNumber}</div>
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {c.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{c.customerName}</div>
                    <div className="text-[10px] text-slate-500">{c.customerType}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900">{c.productName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        c.productType === 'API' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {c.productType}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">{c.productStrengthGrade}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-mono font-semibold text-slate-900">{c.batchLotNumber}</div>
                    <div className="text-[10px] text-slate-500">{c.affectedQuantity}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityBadgeClass(r.severity)}`}>
                        {r.severity || 'Unassessed'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {r.suggestedRouting}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{c.complaintDescription}</p>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onLoadComplaintIntoForm(c, r)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 ml-auto transition-colors shadow-sm"
                    >
                      <span>Load in AI Form</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
