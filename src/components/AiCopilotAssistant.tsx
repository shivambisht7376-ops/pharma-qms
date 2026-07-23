import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ComplaintData, RiskAssessment, PresetDocument } from '../types';
import { PRESET_SAMPLE_DOCUMENTS } from '../data/mockData';
import {
  Bot,
  Send,
  Upload,
  Paperclip,
  Sparkles,
  FileText,
  FileCode,
  Loader2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  FileUp,
  MessageSquare,
  HelpCircle,
  Sliders,
  ChevronRight
} from 'lucide-react';

interface AiCopilotAssistantProps {
  chatHistory: ChatMessage[];
  isProcessing: boolean;
  currentComplaint: ComplaintData;
  currentRisk: RiskAssessment;
  onSendMessage: (text: string, fileAttachment?: { name: string; mimeType: string; size: number; base64Data: string }) => void;
  onClearChat: () => void;
}

export const AiCopilotAssistant: React.FC<AiCopilotAssistantProps> = ({
  chatHistory,
  isProcessing,
  currentComplaint,
  currentRisk,
  onSendMessage,
  onClearChat,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; mimeType: string; size: number; base64Data: string } | null>(null);
  const [showPresetDocs, setShowPresetDocs] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() && !selectedFile) return;

    onSendMessage(inputPrompt, selectedFile || undefined);
    setInputPrompt('');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string)?.split(',')[1] || '';
      setSelectedFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        base64Data: base64String,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetDoc = (doc: PresetDocument) => {
    // Convert doc text to base64
    const base64Text = btoa(unescape(encodeURIComponent(doc.rawText)));
    const filePayload = {
      name: doc.filename,
      mimeType: doc.category === 'PDF' ? 'application/pdf' : 'text/plain',
      size: doc.rawText.length,
      base64Data: base64Text,
    };

    onSendMessage(`Extract complaint details from uploaded document: ${doc.filename}`, filePayload);
    setShowPresetDocs(false);
  };

  const quickPrompts = [
    {
      label: '📝 Log API Complaint',
      text: 'Log a new complaint for Apex BioPharm: Paracetamol API 99.8% Grade, Batch PX902-2026, Mfg 2026-02-10, Exp 2029-02-09. Discoloration specks in 250 kg drums.',
    },
    {
      label: '✏️ Edit Batch & Quantity',
      text: 'Sorry, the batch number is BMX24602 and the affected quantity is 48 capsules.',
    },
    {
      label: '⚠️ Add Adverse Event',
      text: 'Update complaint: Patient reported skin rash and dizziness after intake. Mark adverse event as true.',
    },
    {
      label: '📄 Process Hospital PDF',
      presetDoc: PRESET_SAMPLE_DOCUMENTS[0],
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col h-full overflow-hidden text-slate-200">
      {/* Assistant Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse"></div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-200">AI Co-Pilot Assistant</h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Natural Language Logging • OCR Document Extraction
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPresetDocs(!showPresetDocs)}
            className="text-[10px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition-colors font-medium"
            title="Load sample complaint documents"
          >
            <FileUp className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Upload Doc</span>
          </button>

          <button
            onClick={onClearChat}
            className="text-[10px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center transition-colors font-medium"
            title="Clear Chat Conversation"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Preset Documents Drawer Overlay */}
      {showPresetDocs && (
        <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs animate-in slide-in-from-top-2 duration-200 shrink-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Select Sample Document to Extract & Populate Form:</span>
            </span>
            <button onClick={() => setShowPresetDocs(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {PRESET_SAMPLE_DOCUMENTS.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectPresetDoc(doc)}
                className="w-full text-left p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 transition-all flex items-start justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white group-hover:text-blue-300">{doc.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{doc.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0 mt-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages Log Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto my-4 space-y-4 pr-1.5 text-xs scroll-smooth">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700">
              <Bot className="w-5 h-5" />
            </div>
            <div className="max-w-xs">
              <h3 className="font-semibold text-slate-200 text-sm">AI Co-Pilot Workspace</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Log or edit complaints in plain text or attach inspection documents to extract data into the QMS form.
              </p>
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-6 h-6 rounded-md bg-slate-800 text-blue-400 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 shadow-md leading-relaxed text-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}
              >
                {/* File Attachment Pill */}
                {msg.attachment && (
                  <div className="mb-2 bg-slate-900 p-2 rounded-lg border border-slate-700 flex items-center space-x-2 text-[11px] text-blue-300">
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-medium truncate max-w-[180px]">{msg.attachment.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">({Math.round(msg.attachment.size / 1024)} KB)</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Updated Fields Badge inside AI reply */}
                {msg.updatedFields && msg.updatedFields.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-emerald-400 font-semibold">Updated fields:</span>
                    {msg.updatedFields.map((f, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-900 font-mono">
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                <span className="block text-[9px] text-slate-400 mt-1.5 text-right font-mono">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Processing Loader */}
        {isProcessing && (
          <div className="flex items-center space-x-3 bg-slate-800 border border-slate-700 p-3 rounded-2xl text-xs text-slate-300 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">AI Co-pilot is analyzing request...</p>
              <p className="text-[11px] text-slate-400">Extracting fields & recalculating ICH Q9 Risk Matrix</p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="pt-2 pb-3 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
          <span>Quick Actions:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (qp.presetDoc) {
                  handleSelectPresetDoc(qp.presetDoc);
                } else if (qp.text) {
                  setInputPrompt(qp.text);
                }
              }}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors font-medium"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected File Badge Before Sending */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between text-xs text-slate-200 shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="font-semibold truncate">{selectedFile.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">({Math.round(selectedFile.size / 1024)} KB)</span>
          </div>
          <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Form Area */}
      <form onSubmit={handleSubmit} className="relative shrink-0 pt-2 border-t border-slate-800">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.eml,.txt,.doc,.docx,image/*"
          className="hidden"
        />

        <div className="relative flex items-center bg-slate-950 border border-slate-700 focus-within:border-blue-500 rounded-xl p-1.5 transition-all">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Attach Complaint Document (PDF, Email, Image)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Tell the AI to log or edit the complaint..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-500 px-2 focus:outline-none"
            disabled={isProcessing}
          />

          <button
            type="submit"
            disabled={isProcessing || (!inputPrompt.trim() && !selectedFile)}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg transition-all shrink-0 ml-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-slate-500 mt-2 text-center uppercase tracking-widest">
          AI may generate inaccuracies. All entries subject to Final QA Review.
        </p>
      </form>
    </div>
  );
};
