import { User, ComplaintData, RiskAssessment, PresetDocument } from '../types';

export const DEMO_USERS: User[] = [
  {
    id: 'usr-admin',
    name: 'Dr. Aris Thorne',
    email: 'admin@pharmagx.com',
    role: 'ADMIN',
    roleLabel: 'Quality Director',
    department: 'Global Quality Assurance & Executive Oversight',
    initials: 'AT',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'usr-qa',
    name: 'Elena Vance',
    email: 'qa.manager@pharmagx.com',
    role: 'QA_MANAGER',
    roleLabel: 'QA Complaint Manager',
    department: 'Quality Systems & Complaint Management',
    initials: 'EV',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'usr-qc',
    name: 'Marcus Brody',
    email: 'qc.lead@pharmagx.com',
    role: 'QC_ANALYST',
    roleLabel: 'QC Analytical Lead',
    department: 'QC Analytical Services & Testing Lab',
    initials: 'MB',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'usr-prod',
    name: 'Dr. Sophia Chen',
    email: 'production@pharmagx.com',
    role: 'PRODUCTION_MGR',
    roleLabel: 'API & FDF Ops Manager',
    department: 'Pharmaceutical Manufacturing Operations',
    initials: 'SC',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
];

export const INITIAL_EMPTY_COMPLAINT: ComplaintData = {
  id: '',
  complaintNumber: '',
  status: 'Draft',
  customerName: '',
  customerType: '',
  productName: '',
  productType: 'FDF',
  productStrengthGrade: '',
  batchLotNumber: '',
  mfgDate: '',
  expDate: '',
  affectedQuantity: '',
  complaintDescription: '',
  defectCategory: '',
  packagingCondition: '',
  reporterContact: '',
  storageCondition: '',
  adverseEvent: false,
  adverseEventDetails: '',
  dateLogged: '',
  lastUpdated: '',
};

export const INITIAL_EMPTY_RISK: RiskAssessment = {
  severity: '',
  riskLevel: '',
  recommendedActions: [],
  suggestedRouting: '',
  rootCauseHypothesis: '',
  capaRequired: false,
  rationale: '',
};

export const SAMPLE_HISTORICAL_COMPLAINTS: { complaint: ComplaintData; risk: RiskAssessment }[] = [
  {
    complaint: {
      id: 'cmp-001',
      complaintNumber: 'CMP-2026-0842',
      status: 'Under QA Investigation',
      customerName: 'Apex BioPharm Ltd',
      customerType: 'Contract Manufacturer',
      productName: 'Paracetamol API (Micronized Grade)',
      productType: 'API',
      productStrengthGrade: 'Ph. Eur / USP Grade 99.8%',
      batchLotNumber: 'PX902-2026',
      mfgDate: '2026-02-10',
      expDate: '2029-02-09',
      affectedQuantity: '250 kg (10 x 25kg Drums)',
      complaintDescription: 'Customer reported off-white yellowish specks and residual solvent odor in Drum #4 during raw material receiving inspection.',
      defectCategory: 'Contamination/Foreign Matter',
      packagingCondition: 'Sealed HDPE drums with double polyethylene liner',
      reporterContact: 'dr.harrison@apexbio.com',
      storageCondition: 'Store below 25°C in original unopened container',
      adverseEvent: false,
      adverseEventDetails: '',
      dateLogged: '2026-07-15',
      lastUpdated: '2026-07-18',
    },
    risk: {
      severity: 'Major',
      riskLevel: 'High',
      recommendedActions: [
        'Place batch PX902-2026 on immediate QA Hold across all warehouses',
        'Request retain sample re-testing for residual solvents and heavy metals',
        'Review crystallization and drying batch manufacturing records (BMR-PX902)',
        'Issue Preliminary Notification to API Quality Control Board',
      ],
      suggestedRouting: 'QA Investigation',
      rootCauseHypothesis: 'Possible thermal degradation during fluid bed drying cycle or raw solvent contamination in crystallizer.',
      capaRequired: true,
      rationale: 'Discoloration in API affects physical specs and may indicate chemical degradation before final dosage manufacturing.',
    },
  },
  {
    complaint: {
      id: 'cmp-002',
      complaintNumber: 'CMP-2026-0819',
      status: 'Logged',
      customerName: 'St. Jude Central Hospital',
      customerType: 'Hospital',
      productName: 'Amoxicillin Trihydrate Capsules',
      productType: 'FDF',
      productStrengthGrade: '500 mg Capsules',
      batchLotNumber: 'BMX24602',
      mfgDate: '2026-01-15',
      expDate: '2028-01-14',
      affectedQuantity: '48 capsules (2 blister strips)',
      complaintDescription: 'Pharmacist discovered 3 empty capsule shells inside blister pockets in box #14. Capsules appeared un-filled without powder mass.',
      defectCategory: 'Physical Defect (Dissolution, Color, Hardness)',
      packagingCondition: 'Alu-Alu blister foil intact, no external package tear',
      reporterContact: 'pharmacy@stjudehealth.org',
      storageCondition: 'Controlled Room Temperature 20-25°C',
      adverseEvent: false,
      adverseEventDetails: '',
      dateLogged: '2026-07-19',
      lastUpdated: '2026-07-20',
    },
    risk: {
      severity: 'Major',
      riskLevel: 'Medium',
      recommendedActions: [
        'Inspect capsule filling machine (Encapsulator #3) vacuum check sensors for batch BMX24602',
        'Perform checkweigher rejection log audit for the packaging line',
        'Examine customer sample blister pack under stereomicroscope',
      ],
      suggestedRouting: 'Production Review',
      rootCauseHypothesis: 'Transient nozzle clogging or checkweigher reject mechanism sensor fault on packaging line 2.',
      capaRequired: true,
      rationale: 'Unfilled capsule shells lead to under-dosing / missing dose for patient, posing medical efficacy risk.',
    },
  },
  {
    complaint: {
      id: 'cmp-003',
      complaintNumber: 'CMP-2026-0775',
      status: 'CAPA Initiated',
      customerName: 'MediCare Direct Pharmacy Chain',
      customerType: 'Pharmacy Chain',
      productName: 'Metformin Hydrochloride ER Tablets',
      productType: 'FDF',
      productStrengthGrade: '850 mg Extended Release',
      batchLotNumber: 'MF2026-03',
      mfgDate: '2025-11-20',
      expDate: '2027-11-19',
      affectedQuantity: '1,200 Tablets (12 Bottles)',
      complaintDescription: 'Customer reported slow dissolution in dissolution bath testing during quarterly stability check (Q3 stability failure). Dissolution at Q=80% extended past 12 hrs.',
      defectCategory: 'Efficacy/Potency',
      packagingCondition: '100-count HDPE bottles with induction seal',
      reporterContact: 'qa.compliance@medicaredirect.com',
      storageCondition: '20°C - 25°C, excursions permitted 15-30°C',
      adverseEvent: false,
      adverseEventDetails: '',
      dateLogged: '2026-06-02',
      lastUpdated: '2026-07-10',
    },
    risk: {
      severity: 'Critical',
      riskLevel: 'Critical',
      recommendedActions: [
        'Initiate Class II Voluntary Market Recall for Batch MF2026-03',
        'Notify Regulatory Authorities (FDA / EMA) within 24 hours',
        'Perform comparative dissolution profiling against biobatch reference',
        'Audit polymer matrix ratio and compression force BMR logs',
      ],
      suggestedRouting: 'Regulatory Affairs',
      rootCauseHypothesis: 'Over-granulation or excessive hypromellose binder viscosity causing tablet matrix dissolution retardation.',
      capaRequired: true,
      rationale: 'Out-of-specification extended release dissolution directly impacts bioavailability and therapeutic efficacy in diabetic patients.',
    },
  },
];

export const PRESET_SAMPLE_DOCUMENTS: PresetDocument[] = [
  {
    id: 'doc-email-ceftriaxone',
    title: 'Hospital Email Complaint - Ceftriaxone Vials',
    category: 'Email',
    filename: 'Complaint_Email_StJude_Ceftriaxone_1g.eml',
    description: 'Email from Chief Pharmacist reporting hairline glass cracks in Ceftriaxone 1g Injectable Vials.',
    rawText: `Date: July 20, 2026
From: Dr. Robert Vance <r.vance@metrohealth.org>
To: QA Complaints <complaints@pharmagx.com>
Subject: URGENT: Defective Ceftriaxone Sodium for Injection Vials - Cracked Neck

Dear QA Department,

We are writing to report a serious product defect discovered during inventory staging in our intensive care pharmacy. 

Customer Name: Metro Health System & Central Hospital
Product Name: Ceftriaxone Sodium for Injection (Sterile FDF)
Strength/Grade: 1 g / Vial (Sterile Lyophilized Powder)
Batch / Lot Number: CTX-99301
Manufacturing Date: 2026-03-01
Expiry Date: 2028-02-28
Affected Quantity: 15 Vials out of Box #8 (Total 100 Vials shipped)

Description of Issue:
During inspection, our sterile preparation technician noticed visible hairline fractures near the crimp neck of 15 glass vials. Two vials showed micro-seepage of moisture around the rubber stopper seal, indicating loss of vial vacuum and container closure integrity.

Storage Condition: Kept at controlled 20-25°C in pharmacy main warehouse.
Contact Person: Dr. Robert Vance, Metro Health System Pharmacy Director (Ph: +1-555-019-4820)
Adverse Event: No patient administration occurred; defect caught during pharmacy staging.

Please advise on replacement and immediate investigation instructions.

Regards,
Dr. Robert Vance`,
  },
  {
    id: 'doc-pdf-cipro-api',
    title: 'QA Inspection Report - Ciprofloxacin API',
    category: 'PDF',
    filename: 'Quality_Inspection_Report_Ciprofloxacin_API.pdf',
    description: 'PDF report from BioPharma Global receiving lab showing black particles in Ciprofloxacin API.',
    rawText: `OFFICIAL QUALITY COMPLAINT REPORT
Document ID: QCR-2026-7811
Date of Report: 21 July 2026

CUSTOMER INFORMATION:
Customer Name: BioPharma Global Manufacturing Inc.
Facility Location: Basel, Switzerland
Reporter Email: quality.control@biopharmaglobal.ch

PRODUCT IDENTIFICATION:
Product Name: Ciprofloxacin Hydrochloride API (Bulk Active)
Product Type: API (Active Pharmaceutical Ingredient)
Grade/Purity: USP / EP Grade 99.9% Pure Micronized
Batch/Lot Number: CP-8841-B
Manufacturing Date: 12 January 2026
Expiry Date: 11 January 2029
Affected Quantity: 100 kg (4 Fibredrums)

COMPLAINT DETAILED FINDINGS:
Upon unsealing Drum #2 of 4 (Drum ID CP-8841-D2), black insoluble particulate matter was observed suspended on the inner surface of the polyethylene liner and interspersed near the top layer of bulk powder. 
Microscopic FTIR spectroscopy analysis confirmed the foreign particles to be fluoro-elastomer gasket shavings from process equipment.

PACKAGING & STORAGE:
Packaging: 25 kg fiber drum with double inner PE bag. Seals were intact upon receipt.
Storage: 15-25°C cleanroom warehouse storage.

RECOMMENDED URGENT ACTION:
Customer requests immediate replacement of 100kg batch, root cause CAPA investigation report within 14 days, and vendor credit note.`,
  },
  {
    id: 'doc-audit-ibuprofen',
    title: 'Distributor Defect Note - Ibuprofen 400mg',
    category: 'Audit Note',
    filename: 'Distributor_Return_Note_Ibuprofen_400mg.txt',
    description: 'Distributor report regarding faded lot numbers and crushed cartons.',
    rawText: `CUSTOMER COMPLAINT LOG SHEET
Log Reference: LOG-DIST-2026-990

Reporting Customer: MedSupply Express Wholesale
Product: Ibuprofen Coated Tablets 400mg (FDF)
Batch Number: IB2026-09
Mfg Date: 2026-04-10
Exp Date: 2028-04-09
Affected Quantity: 50 Cartons (2,500 Blister packs)

Defect Details:
Cartons received at regional warehouse exhibit crushed corner packaging, and 30% of individual blister packs have completely faded inkjet lot numbers and expiry dates due to rubbing during transport.

Contact: Logistics QA Manager - sales@medsupplyexpress.com
Adverse Event: None. Cosmetic and labeling print durability defect.`,
  },
];
