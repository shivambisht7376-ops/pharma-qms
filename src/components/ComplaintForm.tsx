import React from 'react';
import { ComplaintData, RiskAssessment } from '../types';
import {
  FileCheck,
  AlertTriangle,
  Bot,
  Building,
  Package,
  Calendar,
  Layers,
  ShieldAlert,
  Save,
  Trash2,
  Download,
  Lock,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Pill,
  Check
} from 'lucide-react';

interface ComplaintFormProps {
  complaint: ComplaintData;
  riskAssessment: RiskAssessment;
  recentlyUpdatedFields: string[];
  onSaveComplaint: () => void;
  onClearForm: () => void;
  onLoadSample: () => void;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({
  complaint,
  riskAssessment,
  recentlyUpdatedFields,
  onSaveComplaint,
  onClearForm,
  onLoadSample,
}) => {
  const isFieldUpdated = (fieldName: string) => recentlyUpdatedFields.includes(fieldName);

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-2 ring-rose-500/30';
      case 'major':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-2 ring-amber-500/30';
      case 'minor':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
    }
  };

  const getRiskLevelBadge = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ complaint, riskAssessment }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${complaint.complaintNumber || 'Complaint_Draft'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const hasData = Boolean(complaint.customerName || complaint.productName || complaint.batchLotNumber || complaint.complaintDescription);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6 flex flex-col h-full overflow-y-auto text-slate-800">
      {/* Top Banner & Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                  Customer Complaint Log
                </h1>
                {complaint.complaintNumber ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-widest font-bold">
                    {complaint.complaintNumber}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 uppercase tracking-widest">
                    Status: AI Synchronized
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pharmaceutical QMS • Real-Time AI Synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onLoadSample}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center space-x-1.5 transition-all font-medium"
              title="Load sample complaint data"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Sample Data</span>
            </button>

            {hasData && (
              <button
                onClick={onClearForm}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-all flex items-center space-x-1"
                title="Clear current form fields"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* AI Managed Notice */}
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start space-x-3">
          <div className="p-1 bg-white border border-slate-200 text-blue-600 rounded shrink-0 mt-0.5">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">AI-Synchronized Form Control:</span> Direct manual typing is locked per GMP audit rules. Form entries and fields are updated in real-time by the <span className="font-bold text-blue-600">AI Co-pilot Assistant</span> in the side panel.
          </div>
        </div>
      </div>

      {/* Main Form Fields Container */}
      <div className="space-y-6">
        {/* Section 1: Customer & Product Type Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Name */}
          <div className={`p-3 rounded-xl bg-slate-50 border transition-all ${
            isFieldUpdated('customerName') ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200' : 'border-slate-200'
          }`}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Customer Name</span>
              {isFieldUpdated('customerName') && <span className="text-[10px] text-emerald-600 font-semibold">Updated by AI</span>}
            </label>
            <input
              type="text"
              readOnly
              value={complaint.customerName || ''}
              placeholder="Awaiting AI extraction..."
              className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-not-allowed placeholder-slate-400"
            />
          </div>

          {/* Customer Type */}
          <div className={`p-3 rounded-xl bg-slate-50 border transition-all ${
            isFieldUpdated('customerType') ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200' : 'border-slate-200'
          }`}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1">
              <span>Customer Type</span>
              {isFieldUpdated('customerType') && <span className="text-[10px] text-emerald-600 font-semibold">Updated by AI</span>}
            </label>
            <input
              type="text"
              readOnly
              value={complaint.customerType || ''}
              placeholder="e.g. Hospital / Distributor"
              className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-not-allowed placeholder-slate-400"
            />
          </div>
        </div>

        {/* Section 2: Product & Batch Details */}
        <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Pharmaceutical Product & Batch Identification</span>
            </div>
            {/* Product Type Toggle Badge */}
            <div className="flex items-center space-x-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs">
              <span className={`px-2 py-0.5 rounded font-bold transition-all ${
                complaint.productType === 'API' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400'
              }`}>
                API
              </span>
              <span className={`px-2 py-0.5 rounded font-bold transition-all ${
                complaint.productType === 'FDF' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
              }`}>
                FDF
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {/* Product Name */}
            <div className={`p-3 rounded-lg bg-white border transition-all ${
              isFieldUpdated('productName') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Product Name
              </label>
              <div className="text-sm font-semibold text-slate-800 truncate">
                {complaint.productName || <span className="text-slate-400 italic">Not set</span>}
              </div>
            </div>

            {/* Strength / Grade */}
            <div className={`p-3 rounded-lg bg-white border transition-all ${
              isFieldUpdated('productStrengthGrade') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Strength / Grade
              </label>
              <div className="text-sm font-semibold text-slate-800 truncate">
                {complaint.productStrengthGrade || <span className="text-slate-400 italic">Not set</span>}
              </div>
            </div>

            {/* Batch / Lot Number */}
            <div className={`p-3 rounded-lg bg-white border transition-all ${
              isFieldUpdated('batchLotNumber') ? 'border-emerald-400 ring-1 ring-emerald-300 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Batch / Lot Number</span>
                {isFieldUpdated('batchLotNumber') && <span className="text-[9px] text-emerald-600">✨ Modified</span>}
              </label>
              <div className="text-sm font-mono font-bold text-blue-600 truncate">
                {complaint.batchLotNumber || <span className="text-slate-400 italic">Not set</span>}
              </div>
            </div>

            {/* Manufacturing Date */}
            <div className={`p-3 rounded-lg bg-white border transition-all ${
              isFieldUpdated('mfgDate') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Mfg Date
              </label>
              <div className="text-xs font-mono text-slate-700">
                {complaint.mfgDate || <span className="text-slate-400 italic">Not set</span>}
              </div>
            </div>

            {/* Expiry Date */}
            <div className={`p-3 rounded-lg bg-white border transition-all ${
              isFieldUpdated('expDate') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Expiry Date
              </label>
              <div className="text-xs font-mono text-slate-700">
                {complaint.expDate || <span className="text-slate-400 italic">Not set</span>}
              </div>
            </div>

            {/* Affected Quantity */}
            <div className={`p-3 rounded-lg bg-white border transition-all ${
              isFieldUpdated('affectedQuantity') ? 'border-emerald-400 ring-1 ring-emerald-300 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Affected Quantity</span>
                {isFieldUpdated('affectedQuantity') && <span className="text-[9px] text-emerald-600">✨ Modified</span>}
              </label>
              <div className="text-sm font-bold text-slate-800 truncate">
                {complaint.affectedQuantity || <span className="text-slate-400 italic">Not set</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Complaint Description & Defect Details */}
        <div className="space-y-4">
          <div className={`p-3.5 rounded-xl bg-slate-50 border transition-all ${
            isFieldUpdated('complaintDescription') ? 'border-emerald-400 bg-emerald-50/30 ring-1 ring-emerald-200' : 'border-slate-200'
          }`}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2">
              <span>Detailed Complaint Description</span>
              {isFieldUpdated('complaintDescription') && <span className="text-[10px] text-emerald-600 font-semibold">Updated by AI</span>}
            </label>
            <textarea
              readOnly
              rows={3}
              value={complaint.complaintDescription || ''}
              placeholder="No complaint description logged yet. Describe the issue in the AI Assistant on the right..."
              className="w-full bg-transparent text-sm text-slate-700 italic placeholder-slate-400 focus:outline-none resize-none cursor-not-allowed leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Defect Category */}
            <div className={`p-3 rounded-xl bg-slate-50 border transition-all ${
              isFieldUpdated('defectCategory') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Defect Category
              </label>
              <div className="text-xs font-semibold text-slate-800">
                {complaint.defectCategory || <span className="text-slate-400 italic">Unspecified</span>}
              </div>
            </div>

            {/* Packaging / Storage Condition */}
            <div className={`p-3 rounded-xl bg-slate-50 border transition-all ${
              isFieldUpdated('packagingCondition') || isFieldUpdated('storageCondition') ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
            }`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Packaging & Storage State
              </label>
              <div className="text-xs text-slate-700">
                {complaint.packagingCondition || complaint.storageCondition ? (
                  <span>{complaint.packagingCondition} {complaint.storageCondition ? `(${complaint.storageCondition})` : ''}</span>
                ) : (
                  <span className="text-slate-400 italic">Not set</span>
                )}
              </div>
            </div>
          </div>

          {/* Adverse Event Alert Box */}
          {complaint.adverseEvent && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  ⚠️ Adverse Health Event Flagged
                </span>
                <p className="text-xs text-rose-700 mt-1">
                  {complaint.adverseEventDetails || 'Adverse medical event indicated during complaint parsing. Immediate Pharmacovigilance review required.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: AI Risk Assessment Box (ICH Q9 Compliant) */}
        <div className={`p-5 rounded-xl space-y-4 transition-all ${
          riskAssessment.severity?.toLowerCase() === 'critical'
            ? 'border-2 border-dashed border-red-200 bg-red-50/30'
            : 'border border-slate-200 bg-slate-50/40'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200/60">
            <div className="flex items-center space-x-2">
              <ShieldAlert className={`w-5 h-5 ${riskAssessment.severity?.toLowerCase() === 'critical' ? 'text-rose-600' : 'text-blue-600'}`} />
              <h2 className={`text-xs font-bold uppercase tracking-wider ${riskAssessment.severity?.toLowerCase() === 'critical' ? 'text-rose-700' : 'text-slate-800'}`}>
                AI Risk Assessment & Quality Guidance (ICH Q9)
              </h2>
            </div>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest font-semibold">
              Auto-Calculated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {/* Severity */}
            <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Severity</span>
              <span className={`font-bold ${
                riskAssessment.severity?.toLowerCase() === 'critical' ? 'text-rose-600' : 'text-slate-800'
              }`}>
                {riskAssessment.severity || 'Pending Evaluation'}
              </span>
            </div>

            {/* Risk Level */}
            <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Risk Matrix Level</span>
              <span className="font-bold text-slate-800">
                {riskAssessment.riskLevel || 'Pending Evaluation'}
              </span>
            </div>

            {/* Suggested Routing */}
            <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
              <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Recommended Route</span>
              <span className="font-bold font-mono text-slate-800">
                {riskAssessment.suggestedRouting || 'Awaiting Input'}
              </span>
            </div>
          </div>

          {/* Root Cause Hypothesis & Rationale */}
          {riskAssessment.rationale && (
            <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm space-y-2 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">AI Rationalization</span>
                <p className="text-xs text-slate-600 leading-normal">{riskAssessment.rationale}</p>
              </div>
              {riskAssessment.rootCauseHypothesis && (
                <div className="border-t border-slate-100 pt-2">
                  <span className="font-semibold text-amber-700">Initial Root Cause Hypothesis:</span>
                  <p className="text-slate-700 mt-0.5">{riskAssessment.rootCauseHypothesis}</p>
                </div>
              )}
            </div>
          )}

          {/* Recommended Next Actions */}
          {riskAssessment.recommendedActions && riskAssessment.recommendedActions.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Recommended Quality Actions (CAPA & QA):
              </span>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {riskAssessment.recommendedActions.map((act, idx) => (
                  <li key={idx} className="flex items-start space-x-2 bg-white p-2 rounded border border-slate-200 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Save / Export Footer Actions */}
      <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3 mt-auto">
        <button
          onClick={handleExportJSON}
          disabled={!hasData}
          className="text-xs px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 shadow-sm flex items-center space-x-2 transition-all font-medium"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export JSON / Report</span>
        </button>

        <button
          id="save-complaint-to-qms-button"
          onClick={onSaveComplaint}
          disabled={!hasData}
          className="text-xs px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold shadow-sm flex items-center space-x-2 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Save Record to QMS Master Log</span>
        </button>
      </div>
    </div>
  );
};
