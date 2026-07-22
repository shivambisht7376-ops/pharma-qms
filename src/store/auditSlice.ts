import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuditLogEntry } from '../types';

interface AuditState {
  auditLogs: AuditLogEntry[];
}

const initialState: AuditState = {
  auditLogs: [
    {
      id: 'aud-001',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      user: 'System Initialization',
      action: 'SYSTEM_READY',
      details: 'Pharma QMS v2.0 — FastAPI + LangGraph + Groq AI Engine initialized. 21 CFR Part 11 Audit Trail Active.',
    },
  ],
};

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    addAuditLog(state, action: PayloadAction<AuditLogEntry>) {
      state.auditLogs = [action.payload, ...state.auditLogs];
    },
    setAuditLogs(state, action: PayloadAction<AuditLogEntry[]>) {
      state.auditLogs = action.payload;
    },
  },
});

export const { addAuditLog, setAuditLogs } = auditSlice.actions;
export default auditSlice.reducer;
