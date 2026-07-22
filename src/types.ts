export type AuthRole = 'ADMIN' | 'QA_MANAGER' | 'QC_ANALYST' | 'PRODUCTION_MGR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  roleLabel: string;
  department: string;
  initials: string;
  badgeColor: string;
  avatarUrl?: string;
}

export type ProductType = 'API' | 'FDF';

export interface ComplaintData {
  id: string;
  complaintNumber: string;
  status: 'Draft' | 'Logged' | 'Under QA Investigation' | 'QC Testing' | 'CAPA Initiated' | 'Closed';
  customerName: string;
  customerType: string;
  productName: string;
  productType: ProductType;
  productStrengthGrade: string;
  batchLotNumber: string;
  mfgDate: string;
  expDate: string;
  affectedQuantity: string;
  complaintDescription: string;
  defectCategory: string;
  packagingCondition: string;
  reporterContact: string;
  storageCondition: string;
  adverseEvent: boolean;
  adverseEventDetails: string;
  dateLogged: string;
  lastUpdated: string;
}

export interface RiskAssessment {
  severity: 'Minor' | 'Major' | 'Critical' | '';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' | '';
  recommendedActions: string[];
  suggestedRouting: string;
  rootCauseHypothesis: string;
  capaRequired: boolean;
  rationale: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  attachment?: {
    name: string;
    mimeType: string;
    size: number;
    base64Data?: string;
  };
  updatedFields?: string[];
  actionType?: 'LOG_NEW' | 'EDIT_FIELDS' | 'EXTRACT_DOCUMENT' | 'GENERAL_QUERY';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  fieldModified?: string;
}

export interface PresetDocument {
  id: string;
  title: string;
  category: 'PDF' | 'Email' | 'Audit Note';
  filename: string;
  description: string;
  rawText: string;
  mockBase64?: string;
}
