import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ComplaintData, RiskAssessment } from '../types';
import { INITIAL_EMPTY_COMPLAINT, INITIAL_EMPTY_RISK, SAMPLE_HISTORICAL_COMPLAINTS } from '../data/mockData';

export interface ComplaintRecord {
  complaint: ComplaintData;
  risk: RiskAssessment;
}

interface ComplaintState {
  complaint: ComplaintData;
  riskAssessment: RiskAssessment;
  recentlyUpdatedFields: string[];
  masterComplaints: ComplaintRecord[];
}

const initialState: ComplaintState = {
  complaint: INITIAL_EMPTY_COMPLAINT,
  riskAssessment: INITIAL_EMPTY_RISK,
  recentlyUpdatedFields: [],
  masterComplaints: SAMPLE_HISTORICAL_COMPLAINTS,
};

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    setComplaint(state, action: PayloadAction<ComplaintData>) {
      state.complaint = action.payload;
    },
    setRiskAssessment(state, action: PayloadAction<RiskAssessment>) {
      state.riskAssessment = action.payload;
    },
    setRecentlyUpdatedFields(state, action: PayloadAction<string[]>) {
      state.recentlyUpdatedFields = action.payload;
    },
    clearForm(state) {
      state.complaint = INITIAL_EMPTY_COMPLAINT;
      state.riskAssessment = INITIAL_EMPTY_RISK;
      state.recentlyUpdatedFields = [];
    },
    setMasterComplaints(state, action: PayloadAction<ComplaintRecord[]>) {
      state.masterComplaints = action.payload;
    },
    addOrUpdateMasterComplaint(state, action: PayloadAction<ComplaintRecord>) {
      const idx = state.masterComplaints.findIndex(
        (m) => m.complaint.complaintNumber === action.payload.complaint.complaintNumber
      );
      if (idx >= 0) {
        state.masterComplaints[idx] = action.payload;
      } else {
        state.masterComplaints = [action.payload, ...state.masterComplaints];
      }
    },
    loadComplaintIntoForm(state, action: PayloadAction<ComplaintRecord>) {
      state.complaint = action.payload.complaint;
      state.riskAssessment = action.payload.risk;
      state.recentlyUpdatedFields = [];
    },
  },
});

export const {
  setComplaint,
  setRiskAssessment,
  setRecentlyUpdatedFields,
  clearForm,
  setMasterComplaints,
  addOrUpdateMasterComplaint,
  loadComplaintIntoForm,
} = complaintSlice.actions;

export default complaintSlice.reducer;
