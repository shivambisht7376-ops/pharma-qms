import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import { User, ComplaintData, RiskAssessment, ChatMessage } from './types';
import { DEMO_USERS, INITIAL_EMPTY_COMPLAINT, INITIAL_EMPTY_RISK, SAMPLE_HISTORICAL_COMPLAINTS } from './data/mockData';
import {
  setComplaint,
  setRiskAssessment,
  setRecentlyUpdatedFields,
  clearForm,
  addOrUpdateMasterComplaint,
  loadComplaintIntoForm,
  setMasterComplaints,
} from './store/complaintSlice';
import { addMessage, clearChat, setProcessing } from './store/chatSlice';
import { addAuditLog } from './store/auditSlice';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ComplaintForm } from './components/ComplaintForm';
import { AiCopilotAssistant } from './components/AiCopilotAssistant';
import { ComplaintsMasterLog } from './components/ComplaintsMasterLog';
import { AuditLogView } from './components/AuditLogView';
import { CheckCircle2 } from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { complaint, riskAssessment, recentlyUpdatedFields, masterComplaints } = useSelector(
    (state: RootState) => state.complaint
  );
  const { chatHistory, isProcessing } = useSelector((state: RootState) => state.chat);
  const { auditLogs } = useSelector((state: RootState) => state.audit);

  // Local UI state
  const [currentUser, setCurrentUser] = useState<User | null>(DEMO_USERS[1]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'copilot' | 'master_log' | 'audit_log'>('copilot');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const logAudit = (action: string, details: string, fieldModified?: string) => {
    dispatch(addAuditLog({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      user: currentUser ? `${currentUser.name} (${currentUser.roleLabel})` : 'Anonymous',
      action,
      details,
      fieldModified,
    }));
  };

  // ── Send message to FastAPI LangGraph backend ──────────────────────────────
  const handleSendMessage = async (
    text: string,
    fileAttachment?: { name: string; mimeType: string; size: number; base64Data: string }
  ) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: fileAttachment
        ? { name: fileAttachment.name, mimeType: fileAttachment.mimeType, size: fileAttachment.size }
        : undefined,
    };
    dispatch(addMessage(userMsg));
    dispatch(setProcessing(true));

    try {
      // Always send current complaint state so EDIT_FIELDS has full context
      const currentComplaintPayload = {
        customer_name: complaint.customerName,
        customer_type: complaint.customerType,
        reporter_contact: complaint.reporterContact,
        product_name: complaint.productName,
        product_type: complaint.productType,
        product_strength_grade: complaint.productStrengthGrade,
        batch_lot_number: complaint.batchLotNumber,
        mfg_date: complaint.mfgDate,
        exp_date: complaint.expDate,
        affected_quantity: complaint.affectedQuantity,
        complaint_description: complaint.complaintDescription,
        defect_category: complaint.defectCategory,
        packaging_condition: complaint.packagingCondition,
        storage_condition: complaint.storageCondition,
        adverse_event: complaint.adverseEvent,
        adverse_event_details: complaint.adverseEventDetails,
      };

      const currentRiskPayload = riskAssessment.severity ? {
        severity: riskAssessment.severity,
        risk_level: riskAssessment.riskLevel,
        suggested_routing: riskAssessment.suggestedRouting,
        root_cause_hypothesis: riskAssessment.rootCauseHypothesis,
        rationale: riskAssessment.rationale,
        capa_required: riskAssessment.capaRequired,
        recommended_actions: riskAssessment.recommendedActions,
      } : null;

      const body: Record<string, any> = {
        prompt: text,
        current_complaint: currentComplaintPayload,
        current_risk: currentRiskPayload,
        user_role: currentUser?.roleLabel || 'QA Manager',
      };

      if (fileAttachment) {
        body.file = {
          name: fileAttachment.name,
          mime_type: fileAttachment.mimeType,
          size: fileAttachment.size,
          base64_data: fileAttachment.base64Data,
        };
      }

      const response = await fetch(`${API_BASE}/copilot/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.detail || 'Server error in processing AI co-pilot request');
      }

      const aiData = resData;
      const cmp = aiData.complaint || {};
      const risk = aiData.risk_assessment || {};
      const updatedFields: string[] = aiData.updated_fields || [];

      // ── Snake→Camel mapping helper ──────────────────────────────────────
      const snakeToCamel: Record<string, keyof ComplaintData> = {
        customer_name: 'customerName',
        customer_type: 'customerType',
        reporter_contact: 'reporterContact',
        product_name: 'productName',
        product_type: 'productType',
        product_strength_grade: 'productStrengthGrade',
        batch_lot_number: 'batchLotNumber',
        mfg_date: 'mfgDate',
        exp_date: 'expDate',
        affected_quantity: 'affectedQuantity',
        complaint_description: 'complaintDescription',
        defect_category: 'defectCategory',
        packaging_condition: 'packagingCondition',
        storage_condition: 'storageCondition',
        adverse_event: 'adverseEvent',
        adverse_event_details: 'adverseEventDetails',
      };

      const generatedCompNo = complaint.complaintNumber || `CMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const action = aiData.action_performed || 'LOG_NEW';

      let updatedComplaint: ComplaintData;

      if (action === 'EDIT_FIELDS') {
        // ── EDIT: delta-merge — only touch the fields the AI actually changed ──
        // This prevents the AI from wiping fields it didn't receive/reproduce
        const delta: Partial<ComplaintData> = {};
        for (const snakeKey of updatedFields) {
          const camelKey = snakeToCamel[snakeKey];
          if (camelKey && cmp[snakeKey] !== undefined && cmp[snakeKey] !== null) {
            (delta as any)[camelKey] = cmp[snakeKey];
          }
        }
        updatedComplaint = {
          ...complaint,       // keep ALL existing values
          ...delta,           // only overwrite the changed fields
          lastUpdated: new Date().toISOString().split('T')[0],
        };
      } else {
        // ── LOG_NEW / EXTRACT_DOCUMENT: full merge of all non-empty fields ──
        const extracted: Partial<ComplaintData> = {};
        for (const [snakeKey, camelKey] of Object.entries(snakeToCamel)) {
          const val = cmp[snakeKey];
          if (val !== null && val !== undefined && val !== '') {
            (extracted as any)[camelKey] = val;
          }
        }
        updatedComplaint = {
          ...INITIAL_EMPTY_COMPLAINT,
          ...complaint,
          id: complaint.id || `cmp-${Date.now()}`,
          complaintNumber: generatedCompNo,
          status: complaint.status === 'Draft' ? 'Logged' : complaint.status,
          dateLogged: complaint.dateLogged || new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0],
          ...extracted,
        };
      }

      const updatedRisk: RiskAssessment = {
        ...INITIAL_EMPTY_RISK,
        ...riskAssessment,
        ...(risk.severity != null && { severity: risk.severity }),
        ...(risk.risk_level != null && { riskLevel: risk.risk_level }),
        ...(risk.suggested_routing != null && { suggestedRouting: risk.suggested_routing }),
        ...(risk.root_cause_hypothesis != null && { rootCauseHypothesis: risk.root_cause_hypothesis }),
        ...(risk.rationale != null && { rationale: risk.rationale }),
        ...(risk.capa_required != null && { capaRequired: risk.capa_required }),
        ...(risk.recommended_actions != null && { recommendedActions: risk.recommended_actions }),
      };

      dispatch(setComplaint(updatedComplaint));
      dispatch(setRiskAssessment(updatedRisk));
      dispatch(setRecentlyUpdatedFields(updatedFields));

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: aiData.assistant_reply || 'Complaint form updated successfully.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedFields,
        actionType: aiData.action_performed,
      };
      dispatch(addMessage(aiMsg));

      logAudit(
        aiData.action_performed || 'AI_FIELD_UPDATE',
        `AI Co-pilot updated form ${updatedComplaint.complaintNumber}. Fields: [${updatedFields.slice(0, 5).join(', ')}]. Severity: ${updatedRisk.severity}, Risk: ${updatedRisk.riskLevel}`,
        updatedFields.join(', ')
      );

      showToast(`✓ AI updated: [${updatedFields.slice(0, 3).join(', ')}${updatedFields.length > 3 ? '...' : ''}]`);
    } catch (err: any) {
      console.error('handleSendMessage error:', err);
      const errMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ ${err.message || 'Unable to connect to AI server. Make sure the Python backend is running on port 8000.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      dispatch(addMessage(errMsg));
      showToast('AI server error. Check that the backend is running.', 'error');
    } finally {
      dispatch(setProcessing(false));
    }
  };

  // ── Save to QMS (PostgreSQL via FastAPI) ──────────────────────────────────
  const handleSaveComplaint = async () => {
    if (!complaint.customerName && !complaint.productName) return;

    try {
      const body = {
        complaint: {
          complaint_number: complaint.complaintNumber,
          status: complaint.status === 'Draft' ? 'Logged' : complaint.status,
          customer_name: complaint.customerName,
          customer_type: complaint.customerType,
          reporter_contact: complaint.reporterContact,
          product_name: complaint.productName,
          product_type: complaint.productType,
          product_strength_grade: complaint.productStrengthGrade,
          batch_lot_number: complaint.batchLotNumber,
          mfg_date: complaint.mfgDate,
          exp_date: complaint.expDate,
          affected_quantity: complaint.affectedQuantity,
          complaint_description: complaint.complaintDescription,
          defect_category: complaint.defectCategory,
          packaging_condition: complaint.packagingCondition,
          storage_condition: complaint.storageCondition,
          adverse_event: complaint.adverseEvent,
          adverse_event_details: complaint.adverseEventDetails,
          date_logged: complaint.dateLogged || new Date().toISOString().split('T')[0],
          last_updated: new Date().toISOString().split('T')[0],
        },
        risk: {
          severity: riskAssessment.severity,
          risk_level: riskAssessment.riskLevel,
          suggested_routing: riskAssessment.suggestedRouting,
          root_cause_hypothesis: riskAssessment.rootCauseHypothesis,
          rationale: riskAssessment.rationale,
          capa_required: riskAssessment.capaRequired,
          recommended_actions: riskAssessment.recommendedActions,
        },
        user_name: currentUser ? `${currentUser.name} (${currentUser.roleLabel})` : 'QA Manager',
      };

      const res = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const saved = await res.json();
        // Map API response back to ComplaintData shape
        const savedComplaint: ComplaintData = {
          id: saved.complaint.id,
          complaintNumber: saved.complaint.complaint_number,
          status: saved.complaint.status as ComplaintData['status'],
          customerName: saved.complaint.customer_name,
          customerType: saved.complaint.customer_type,
          reporterContact: saved.complaint.reporter_contact,
          productName: saved.complaint.product_name,
          productType: saved.complaint.product_type as 'API' | 'FDF',
          productStrengthGrade: saved.complaint.product_strength_grade,
          batchLotNumber: saved.complaint.batch_lot_number,
          mfgDate: saved.complaint.mfg_date,
          expDate: saved.complaint.exp_date,
          affectedQuantity: saved.complaint.affected_quantity,
          complaintDescription: saved.complaint.complaint_description,
          defectCategory: saved.complaint.defect_category,
          packagingCondition: saved.complaint.packaging_condition,
          storageCondition: saved.complaint.storage_condition,
          adverseEvent: saved.complaint.adverse_event,
          adverseEventDetails: saved.complaint.adverse_event_details,
          dateLogged: saved.complaint.date_logged,
          lastUpdated: saved.complaint.last_updated,
        };
        const savedRisk: RiskAssessment = {
          severity: saved.risk?.severity as RiskAssessment['severity'] || '',
          riskLevel: saved.risk?.risk_level as RiskAssessment['riskLevel'] || '',
          suggestedRouting: saved.risk?.suggested_routing || '',
          rootCauseHypothesis: saved.risk?.root_cause_hypothesis || '',
          rationale: saved.risk?.rationale || '',
          capaRequired: saved.risk?.capa_required || false,
          recommendedActions: saved.risk?.recommended_actions || [],
        };
        dispatch(addOrUpdateMasterComplaint({ complaint: savedComplaint, risk: savedRisk }));
        showToast(`✓ Saved ${savedComplaint.complaintNumber} to QMS Master Log (PostgreSQL)`);
        logAudit('COMPLAINT_SAVED', `Complaint ${savedComplaint.complaintNumber} persisted to Neon PostgreSQL.`);
      } else {
        // Fallback: save locally only
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || 'DB not connected or validation failed.';
        dispatch(addOrUpdateMasterComplaint({ complaint, risk: riskAssessment }));
        showToast(`Save failed: ${errorMessage}`, 'error');
      }
    } catch {
      // Fallback: save locally
      dispatch(addOrUpdateMasterComplaint({ complaint, risk: riskAssessment }));
      showToast(`Saved locally — DB not reachable.`, 'error');
    }
  };

  // ── Load master complaints from DB ────────────────────────────────────────
  const handleLoadMasterLog = async () => {
    try {
      const res = await fetch(`${API_BASE}/complaints`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((record: any) => ({
          complaint: {
            id: record.complaint.id,
            complaintNumber: record.complaint.complaint_number,
            status: record.complaint.status,
            customerName: record.complaint.customer_name,
            customerType: record.complaint.customer_type,
            reporterContact: record.complaint.reporter_contact,
            productName: record.complaint.product_name,
            productType: record.complaint.product_type,
            productStrengthGrade: record.complaint.product_strength_grade,
            batchLotNumber: record.complaint.batch_lot_number,
            mfgDate: record.complaint.mfg_date,
            expDate: record.complaint.exp_date,
            affectedQuantity: record.complaint.affected_quantity,
            complaintDescription: record.complaint.complaint_description,
            defectCategory: record.complaint.defect_category,
            packagingCondition: record.complaint.packaging_condition,
            storageCondition: record.complaint.storage_condition,
            adverseEvent: record.complaint.adverse_event,
            adverseEventDetails: record.complaint.adverse_event_details,
            dateLogged: record.complaint.date_logged,
            lastUpdated: record.complaint.last_updated,
          } as ComplaintData,
          risk: record.risk ? {
            severity: record.risk.severity,
            riskLevel: record.risk.risk_level,
            suggestedRouting: record.risk.suggested_routing,
            rootCauseHypothesis: record.risk.root_cause_hypothesis,
            rationale: record.risk.rationale,
            capaRequired: record.risk.capa_required,
            recommendedActions: record.risk.recommended_actions || [],
          } as RiskAssessment : INITIAL_EMPTY_RISK,
        }));
        // If DB has real data use it, otherwise fall back to sample data
        if (mapped.length > 0) {
          dispatch(setMasterComplaints(mapped));
        } else {
          dispatch(setMasterComplaints(SAMPLE_HISTORICAL_COMPLAINTS));
        }
      }
    } catch {
      // silently keep existing data
    }
  };

  // ── Auto-load DB complaints on every page startup ─────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { handleLoadMasterLog(); }, []);

  const handleClearForm = () => {
    dispatch(clearForm());
    logAudit('FORM_RESET', 'Cleared customer complaint form.');
    showToast('Form reset.');
  };

  const handleLoadSample = () => {
    const sample = SAMPLE_HISTORICAL_COMPLAINTS[0];
    dispatch(loadComplaintIntoForm(sample));
    dispatch(setRecentlyUpdatedFields(['customerName', 'productName', 'batchLotNumber', 'affectedQuantity', 'complaintDescription']));
    logAudit('SAMPLE_LOADED', `Loaded sample ${sample.complaint.complaintNumber} into form.`);
    showToast(`Loaded sample ${sample.complaint.complaintNumber}`);
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    logAudit('USER_SWITCH', `Switched to ${user.name} (${user.roleLabel}).`);
    showToast(`Switched to ${user.name}`);
  };

  const criticalRiskCount = masterComplaints.filter(
    (m) => m.risk.severity?.toLowerCase() === 'critical' || m.risk.riskLevel?.toLowerCase() === 'critical'
  ).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-xs animate-in slide-in-from-top-3 duration-200 border ${
          toastType === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${toastType === 'error' ? 'text-rose-500' : 'text-emerald-600'}`} />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'master_log') handleLoadMasterLog();
        }}
        totalComplaintsCount={masterComplaints.length}
        criticalRiskCount={criticalRiskCount}
        onViewComplaints={() => {
          setActiveTab('master_log');
          handleLoadMasterLog();
        }}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Co-pilot Split Screen */}
        {activeTab === 'copilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[calc(100vh-140px)]">
            <div className="lg:col-span-7 flex flex-col">
              <ComplaintForm
                complaint={complaint}
                riskAssessment={riskAssessment}
                recentlyUpdatedFields={recentlyUpdatedFields}
                onSaveComplaint={handleSaveComplaint}
                onClearForm={handleClearForm}
                onLoadSample={handleLoadSample}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col">
              <AiCopilotAssistant
                chatHistory={chatHistory}
                isProcessing={isProcessing}
                currentComplaint={complaint}
                currentRisk={riskAssessment}
                onSendMessage={handleSendMessage}
                onClearChat={() => dispatch(clearChat())}
              />
            </div>
          </div>
        )}

        {/* Master Log */}
        {activeTab === 'master_log' && (
          <ComplaintsMasterLog
            complaintsList={masterComplaints}
            onLoadComplaintIntoForm={(c, r) => {
              dispatch(loadComplaintIntoForm({ complaint: c, risk: r }));
              setActiveTab('copilot');
              showToast(`Loaded ${c.complaintNumber} into AI workspace.`);
            }}
          />
        )}

        {/* Audit Log */}
        {activeTab === 'audit_log' && <AuditLogView auditLogs={auditLogs} />}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(usr) => {
          handleSelectUser(usr);
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
