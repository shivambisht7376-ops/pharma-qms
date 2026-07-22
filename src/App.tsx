import React, { useState } from 'react';
import { User, ComplaintData, RiskAssessment, ChatMessage, AuditLogEntry } from './types';
import { DEMO_USERS, INITIAL_EMPTY_COMPLAINT, INITIAL_EMPTY_RISK, SAMPLE_HISTORICAL_COMPLAINTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ComplaintForm } from './components/ComplaintForm';
import { AiCopilotAssistant } from './components/AiCopilotAssistant';
import { ComplaintsMasterLog } from './components/ComplaintsMasterLog';
import { AuditLogView } from './components/AuditLogView';
import { CheckCircle2, ShieldAlert, Sparkles, X } from 'lucide-react';

export default function App() {
  // Current Authenticated User (Defaults to QA Manager)
  const [currentUser, setCurrentUser] = useState<User | null>(DEMO_USERS[1]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'copilot' | 'master_log' | 'audit_log'>('copilot');

  // Active Complaint Form State
  const [complaint, setComplaint] = useState<ComplaintData>(INITIAL_EMPTY_COMPLAINT);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment>(INITIAL_EMPTY_RISK);
  const [recentlyUpdatedFields, setRecentlyUpdatedFields] = useState<string[]>([]);

  // AI Co-pilot Chat Conversation
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Master Complaints Database List
  const [masterComplaints, setMasterComplaints] = useState<{ complaint: ComplaintData; risk: RiskAssessment }[]>(
    SAMPLE_HISTORICAL_COMPLAINTS
  );

  // GMP Audit Trail Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'aud-001',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      user: 'System Initialization',
      action: 'SYSTEM_READY',
      details: 'Pharma QMS AI Co-pilot Engine initialized. 21 CFR Part 11 Audit Trail Active.',
    },
    {
      id: 'aud-002',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      user: 'Elena Vance (QA Complaint Manager)',
      action: 'USER_LOGIN',
      details: 'Logged into QMS Workspace with QA Manager credentials.',
    },
  ]);

  // Notifications / Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper to log audit trail
  const addAuditLog = (action: string, details: string, fieldModified?: string) => {
    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      user: currentUser ? `${currentUser.name} (${currentUser.roleLabel})` : 'Anonymous User',
      action,
      details,
      fieldModified,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Send message to Gemini Express backend
  const handleSendMessage = async (
    text: string,
    fileAttachment?: { name: string; mimeType: string; size: number; base64Data: string }
  ) => {
    const userMsgId = `msg-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: fileAttachment ? { name: fileAttachment.name, mimeType: fileAttachment.mimeType, size: fileAttachment.size } : undefined,
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/copilot/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          currentComplaint: complaint.customerName || complaint.productName ? complaint : null,
          currentRisk: riskAssessment.severity ? riskAssessment : null,
          file: fileAttachment,
          userRole: currentUser?.roleLabel || 'QA Manager',
        }),
      });

      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.error || 'Server error in processing AI co-pilot request');
      }

      const aiData = resData.data;

      // Ensure complaint ID & reference number exist
      const generatedCompNo = complaint.complaintNumber || `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const updatedComplaintObj: ComplaintData = {
        ...INITIAL_EMPTY_COMPLAINT,
        ...complaint,
        ...aiData.complaint,
        id: complaint.id || `cmp-${Date.now()}`,
        complaintNumber: generatedCompNo,
        status: complaint.status === 'Draft' ? 'Logged' : complaint.status,
        dateLogged: complaint.dateLogged || new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      const updatedRiskObj: RiskAssessment = {
        ...INITIAL_EMPTY_RISK,
        ...riskAssessment,
        ...aiData.riskAssessment,
      };

      // Update state
      setComplaint(updatedComplaintObj);
      setRiskAssessment(updatedRiskObj);

      const modifiedFields = aiData.updatedFields || [];
      setRecentlyUpdatedFields(modifiedFields);

      // Append AI response to chat
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: aiData.assistantReply || 'Form fields updated and risk assessment recalculated successfully.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedFields: modifiedFields,
        actionType: aiData.actionPerformed,
      };

      setChatHistory((prev) => [...prev, aiMessage]);

      // Add to audit trail
      addAuditLog(
        aiData.actionPerformed || 'AI_FIELD_UPDATE',
        `AI Co-pilot synced form for ${updatedComplaintObj.complaintNumber}. Updated fields: [${modifiedFields.join(', ')}]. Severity: ${updatedRiskObj.severity}, Risk: ${updatedRiskObj.riskLevel}`,
        modifiedFields.join(', ')
      );

      showToast(`AI Co-pilot updated form fields: [${modifiedFields.slice(0, 3).join(', ')}]`);
    } catch (err: any) {
      console.error('Error in handleSendMessage:', err);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        text: `⚠️ Error processing request: ${err.message || 'Unable to connect to AI server. Please check environment configuration.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Save current complaint into QMS database
  const handleSaveComplaint = () => {
    if (!complaint.customerName && !complaint.productName) return;

    const existingIndex = masterComplaints.findIndex(
      (m) => m.complaint.complaintNumber === complaint.complaintNumber
    );

    const recordToSave = {
      complaint: {
        ...complaint,
        status: complaint.status === 'Draft' ? 'Logged' : complaint.status,
      },
      risk: riskAssessment,
    };

    if (existingIndex >= 0) {
      const updatedList = [...masterComplaints];
      updatedList[existingIndex] = recordToSave;
      setMasterComplaints(updatedList);
      showToast(`Updated record ${complaint.complaintNumber} in QMS database.`);
      addAuditLog('COMPLAINT_UPDATE', `Updated complaint ${complaint.complaintNumber} in Master Log.`);
    } else {
      setMasterComplaints((prev) => [recordToSave, ...prev]);
      showToast(`Saved new complaint ${complaint.complaintNumber} to QMS database.`);
      addAuditLog('COMPLAINT_CREATE', `Saved new complaint ${complaint.complaintNumber} for customer ${complaint.customerName}.`);
    }
  };

  // Clear Form
  const handleClearForm = () => {
    setComplaint(INITIAL_EMPTY_COMPLAINT);
    setRiskAssessment(INITIAL_EMPTY_RISK);
    setRecentlyUpdatedFields([]);
    addAuditLog('FORM_RESET', 'Cleared customer complaint form fields.');
    showToast('Complaint form reset.');
  };

  // Load sample record into form
  const handleLoadSample = () => {
    const sample = SAMPLE_HISTORICAL_COMPLAINTS[0];
    setComplaint(sample.complaint);
    setRiskAssessment(sample.risk);
    setRecentlyUpdatedFields(['customerName', 'productName', 'batchLotNumber', 'affectedQuantity', 'complaintDescription']);
    addAuditLog('SAMPLE_LOADED', `Loaded sample complaint ${sample.complaint.complaintNumber} into form.`);
    showToast(`Loaded sample complaint ${sample.complaint.complaintNumber} into AI Form.`);
  };

  // Select User
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    addAuditLog('USER_SWITCH', `Switched active user session to ${user.name} (${user.roleLabel}).`);
    showToast(`Switched active profile to ${user.name}`);
  };

  // Critical risk count
  const criticalRiskCount = masterComplaints.filter(
    (m) => m.risk.severity?.toLowerCase() === 'critical' || m.risk.riskLevel?.toLowerCase() === 'critical'
  ).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-slate-200 text-slate-800 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-xs animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Application Navbar */}
      <Navbar
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalComplaintsCount={masterComplaints.length}
        criticalRiskCount={criticalRiskCount}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: AI Co-pilot Split Screen Layout (Left Form + Right Assistant) */}
        {activeTab === 'copilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[calc(100vh-140px)]">
            {/* LEFT SECTION: Log Customer Complaint Form */}
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

            {/* RIGHT SECTION: AI Co-pilot Assistant */}
            <div className="lg:col-span-5 flex flex-col">
              <AiCopilotAssistant
                chatHistory={chatHistory}
                isProcessing={isProcessing}
                currentComplaint={complaint}
                currentRisk={riskAssessment}
                onSendMessage={handleSendMessage}
                onClearChat={() => setChatHistory([])}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Complaints Master Log Table */}
        {activeTab === 'master_log' && (
          <ComplaintsMasterLog
            complaintsList={masterComplaints}
            onLoadComplaintIntoForm={(c, r) => {
              setComplaint(c);
              setRiskAssessment(r);
              setActiveTab('copilot');
              showToast(`Loaded ${c.complaintNumber} into AI Form workspace.`);
            }}
          />
        )}

        {/* Tab 3: GMP Audit Trail */}
        {activeTab === 'audit_log' && <AuditLogView auditLogs={auditLogs} />}
      </main>

      {/* Auth Modal for Login / Demo Users */}
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
