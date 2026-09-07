// =============================================================
// IDVerify — Centralized Mock Data
// All mock data lives here. Import from this file only.
// =============================================================

import {
  User, Case, Document, Alert, AuditLog, Notification,
  OCRData, FaceResult, TamperResult,
} from '@/types';

// ── Users ──────────────────────────────────────────────────────

export const mockUsers: User[] = [
  {
    id: 'officer-1',
    email: 'officer@ssb.gov.in',
    name: 'Rajesh Kumar',
    role: 'OFFICER',
    employeeId: 'OFC-2024-001',
    department: 'Border Security Force',
    username: 'rajesh.kumar',
    accountStatus: 'ACTIVE',
    lastLogin: '2026-09-07T18:00:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2026-09-07T18:00:00Z',
  },
  {
    id: 'officer-2',
    email: 'officer2@ssb.gov.in',
    name: 'Priya Sharma',
    role: 'OFFICER',
    employeeId: 'OFC-2024-002',
    department: 'Border Security Force',
    username: 'priya.sharma',
    accountStatus: 'ACTIVE',
    lastLogin: '2026-09-07T17:30:00Z',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2026-09-07T17:30:00Z',
  },
  {
    id: 'admin-1',
    email: 'admin@ssb.gov.in',
    name: 'Anil Sharma',
    role: 'ADMIN',
    employeeId: 'ADM-2024-001',
    department: 'Security Review Division',
    username: 'anil.sharma',
    accountStatus: 'ACTIVE',
    lastLogin: '2026-09-07T18:30:00Z',
    createdAt: '2023-11-01T09:00:00Z',
    updatedAt: '2026-09-07T18:30:00Z',
  },
];

// ── OCR Data ───────────────────────────────────────────────────

const passportOCR: OCRData = {
  status: 'COMPLETED',
  overallConfidence: 96.8,
  fields: [
    { label: 'Full Name', value: 'RAJESH KUMAR', confidence: 98.4 },
    { label: 'Date of Birth', value: '12 MAY 1998', confidence: 96.2 },
    { label: 'Nationality', value: 'INDIAN', confidence: 99.1 },
    { label: 'Gender', value: 'MALE', confidence: 99.8 },
    { label: 'Passport Number', value: 'N1234567', confidence: 97.5 },
    { label: 'Date of Issue', value: '15 JAN 2020', confidence: 95.3 },
    { label: 'Date of Expiry', value: '14 JAN 2030', confidence: 94.8 },
    { label: 'Place of Issue', value: 'NEW DELHI', confidence: 93.2 },
  ],
};

const suspiciousPassportOCR: OCRData = {
  status: 'COMPLETED',
  overallConfidence: 62.4,
  fields: [
    { label: 'Full Name', value: 'ARJUN VERMA', confidence: 88.1 },
    { label: 'Date of Birth', value: '03 AUG 1991', confidence: 71.4 },
    { label: 'Nationality', value: 'INDIAN', confidence: 92.0 },
    { label: 'Gender', value: 'MALE', confidence: 99.0 },
    { label: 'Passport Number', value: 'P9876543', confidence: 58.3 },
    { label: 'Date of Issue', value: '22 FEB 2019', confidence: 45.6 },
    { label: 'Date of Expiry', value: '21 FEB 2029', confidence: 44.2 },
    { label: 'Place of Issue', value: 'MUMBAI', confidence: 62.8 },
  ],
  warnings: ['Low confidence on document serial fields', 'Possible font inconsistency detected'],
};

const nationalIdOCR: OCRData = {
  status: 'COMPLETED',
  overallConfidence: 91.2,
  fields: [
    { label: 'Full Name', value: 'PRIYA SHARMA', confidence: 97.1 },
    { label: 'Date of Birth', value: '25 NOV 1995', confidence: 94.5 },
    { label: 'ID Number', value: 'IND-9812-3456-7890', confidence: 88.3 },
    { label: 'Gender', value: 'FEMALE', confidence: 99.2 },
    { label: 'Address', value: 'BANGALORE, KARNATAKA', confidence: 85.7 },
  ],
};

// ── Face Results ────────────────────────────────────────────────

const faceMatch: FaceResult = {
  status: 'MATCH',
  similarity: 94.8,
  liveness: 98.1,
  processedAt: '2026-09-07T18:02:05Z',
};

const faceMismatch: FaceResult = {
  status: 'NO_MATCH',
  similarity: 38.2,
  liveness: 91.4,
  processedAt: '2026-09-07T17:45:10Z',
};

const faceReview: FaceResult = {
  status: 'REVIEW',
  similarity: 71.6,
  liveness: 95.3,
  processedAt: '2026-09-07T16:30:22Z',
};

// ── Tamper Results ─────────────────────────────────────────────

const tamperClean: TamperResult = {
  status: 'CLEAN',
  confidence: 97.2,
};

const tamperSuspicious: TamperResult = {
  status: 'SUSPICIOUS',
  confidence: 68.5,
  details: 'Metadata inconsistency detected in document header region',
};

// ── Documents ─────────────────────────────────────────────────

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    caseId: 'case-SSB1021',
    fileName: 'passport_rajesh_kumar.jpg',
    fileUrl: '/mock/passport-sample.jpg',
    docType: 'PASSPORT',
    sha256Hash: 'a82f9c3d1e74b2f8912c45d6e7890abc1234def5678901234567890123456789',
    ocrData: passportOCR,
    tamperResult: tamperClean,
    faceResult: faceMatch,
    fileSize: 2457600,
    createdAt: '2026-09-07T17:01:24Z',
  },
  {
    id: 'doc-2',
    caseId: 'case-SSB1021',
    fileName: 'supporting_doc_rajesh.pdf',
    fileUrl: '/mock/doc-sample.pdf',
    docType: 'DOB_PROOF',
    sha256Hash: 'b91e7f2a4c6d8e0912345678abcdef01234567890abcdef1234567890abcdef',
    tamperResult: tamperClean,
    fileSize: 512000,
    createdAt: '2026-09-07T17:03:00Z',
  },
  {
    id: 'doc-3',
    caseId: 'case-SSB1025',
    fileName: 'passport_arjun_verma.jpg',
    fileUrl: '/mock/passport-suspicious.jpg',
    docType: 'PASSPORT',
    sha256Hash: 'c72d8e1f3b5a7c9012345678901234567890abcdef1234567890abcdef12345',
    ocrData: suspiciousPassportOCR,
    tamperResult: tamperSuspicious,
    faceResult: faceMismatch,
    fileSize: 3145728,
    createdAt: '2026-09-07T17:40:00Z',
  },
  {
    id: 'doc-4',
    caseId: 'case-SSB1025',
    fileName: 'visa_arjun_verma.jpg',
    fileUrl: '/mock/visa-sample.jpg',
    docType: 'VISA_STAMP',
    sha256Hash: 'd83e9f2a4b6c8d0e123456789012345678901234abcdef567890abcdef123456',
    tamperResult: tamperSuspicious,
    fileSize: 1048576,
    createdAt: '2026-09-07T17:41:30Z',
  },
  {
    id: 'doc-5',
    caseId: 'case-SSB1025',
    fileName: 'national_id_arjun.jpg',
    fileUrl: '/mock/national-id.jpg',
    docType: 'NATIONAL_ID',
    sha256Hash: 'e94f0a3b5c7d9e1f234567890123456789012345bcdef678901bcdef1234567',
    tamperResult: tamperSuspicious,
    fileSize: 1835008,
    createdAt: '2026-09-07T17:42:15Z',
  },
  {
    id: 'doc-6',
    caseId: 'case-SSB1028',
    fileName: 'national_id_priya.jpg',
    fileUrl: '/mock/national-id.jpg',
    docType: 'NATIONAL_ID',
    sha256Hash: 'f05a1b4c6d8e0f234567890abcdef1234567890123456bcdef789012345678',
    ocrData: nationalIdOCR,
    tamperResult: tamperClean,
    faceResult: faceReview,
    fileSize: 2097152,
    createdAt: '2026-09-07T16:28:00Z',
  },
  {
    id: 'doc-7',
    caseId: 'case-SSB1030',
    fileName: 'driving_license_meera.jpg',
    fileUrl: '/mock/driving-license.jpg',
    docType: 'DRIVING_LICENSE',
    sha256Hash: '1a6b2c5d7e9f0a234567890abcdef012345678901234567bcdef890123456789',
    tamperResult: tamperClean,
    fileSize: 921600,
    createdAt: '2026-09-07T15:10:00Z',
  },
];

// ── Cases ─────────────────────────────────────────────────────

export let mockCases: Case[] = [
  {
    id: 'case-SSB1021',
    caseNumber: 'SSB-1021',
    title: 'Passport Verification — Rajesh Kumar',
    status: 'APPROVED',
    riskScore: 12,
    riskLevel: 'LOW',
    officerId: 'officer-1',
    officerName: 'Rajesh Kumar',
    documents: mockDocuments.filter((d) => d.caseId === 'case-SSB1021'),
    createdAt: '2026-09-07T17:01:00Z',
    updatedAt: '2026-09-07T17:15:00Z',
  },
  {
    id: 'case-SSB1025',
    caseNumber: 'SSB-1025',
    title: 'Identity Verification — Arjun Verma',
    status: 'FLAGGED',
    riskScore: 78,
    riskLevel: 'HIGH',
    officerId: 'officer-1',
    officerName: 'Rajesh Kumar',
    documents: mockDocuments.filter((d) => d.caseId === 'case-SSB1025'),
    flagReason: 'FACE_MISMATCH',
    officerObservations:
      'Face similarity is critically low (38.2%). Possible document forgery. Passport metadata shows anomalies. Immediate admin review required.',
    createdAt: '2026-09-07T17:40:00Z',
    updatedAt: '2026-09-07T18:02:18Z',
  },
  {
    id: 'case-SSB1028',
    caseNumber: 'SSB-1028',
    title: 'Document Screening — Priya Sharma',
    status: 'UNDER_REVIEW',
    riskScore: 54,
    riskLevel: 'MEDIUM',
    officerId: 'officer-2',
    officerName: 'Priya Sharma',
    documents: mockDocuments.filter((d) => d.caseId === 'case-SSB1028'),
    flagReason: 'OCR_INCONSISTENCY',
    officerObservations: 'OCR confidence score is borderline. Face match is in review zone. Referred for secondary review.',
    createdAt: '2026-09-07T16:25:00Z',
    updatedAt: '2026-09-07T16:45:00Z',
  },
  {
    id: 'case-SSB1030',
    caseNumber: 'SSB-1030',
    title: 'Document Verification — Meera Joshi',
    status: 'PENDING',
    riskScore: 22,
    riskLevel: 'LOW',
    officerId: 'officer-1',
    officerName: 'Rajesh Kumar',
    documents: mockDocuments.filter((d) => d.caseId === 'case-SSB1030'),
    createdAt: '2026-09-07T15:08:00Z',
    updatedAt: '2026-09-07T15:10:00Z',
  },
  {
    id: 'case-SSB1022',
    caseNumber: 'SSB-1022',
    title: 'Visa Verification — Suresh Patel',
    status: 'APPROVED',
    riskScore: 8,
    riskLevel: 'LOW',
    officerId: 'officer-2',
    officerName: 'Priya Sharma',
    documents: [],
    createdAt: '2026-09-07T14:30:00Z',
    updatedAt: '2026-09-07T14:50:00Z',
  },
  {
    id: 'case-SSB1023',
    caseNumber: 'SSB-1023',
    title: 'Identity Check — Kavita Nair',
    status: 'REJECTED',
    riskScore: 91,
    riskLevel: 'HIGH',
    officerId: 'officer-2',
    officerName: 'Priya Sharma',
    documents: [],
    flagReason: 'SUSPICIOUS_IDENTITY',
    officerObservations: 'Multiple verification failures. Documents appear to be fabricated.',
    adminDecision: 'REJECT',
    adminDecisionReason: 'Identity cannot be verified. Documents are fraudulent.',
    adminDecisionAt: '2026-09-07T13:00:00Z',
    createdAt: '2026-09-07T12:00:00Z',
    updatedAt: '2026-09-07T13:00:00Z',
  },
  {
    id: 'case-SSB1024',
    caseNumber: 'SSB-1024',
    title: 'Passport Check — Amit Singh',
    status: 'APPROVED',
    riskScore: 15,
    riskLevel: 'LOW',
    officerId: 'officer-1',
    officerName: 'Rajesh Kumar',
    documents: [],
    createdAt: '2026-09-07T11:00:00Z',
    updatedAt: '2026-09-07T11:30:00Z',
  },
  {
    id: 'case-SSB1026',
    caseNumber: 'SSB-1026',
    title: 'Document Screening — Rohit Mishra',
    status: 'FLAGGED',
    riskScore: 67,
    riskLevel: 'HIGH',
    officerId: 'officer-1',
    officerName: 'Rajesh Kumar',
    documents: [],
    flagReason: 'TAMPERING_DETECTED',
    officerObservations: 'Document tamper analysis indicates 68.5% suspicious confidence.',
    createdAt: '2026-09-07T10:00:00Z',
    updatedAt: '2026-09-07T10:30:00Z',
  },
];

// Mutable update for mock admin decisions
export function updateMockCase(caseId: string, updates: Partial<Case>): void {
  const idx = mockCases.findIndex((c) => c.id === caseId);
  if (idx !== -1) {
    mockCases[idx] = { ...mockCases[idx], ...updates };
  }
}

// ── Alerts ─────────────────────────────────────────────────────

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    caseId: 'case-SSB1025',
    caseNumber: 'SSB-1025',
    officerId: 'officer-1',
    officerName: 'Rajesh Kumar',
    alertType: 'FACE_MISMATCH',
    severity: 'HIGH',
    reason: 'Face similarity score (38.2%) is critically below the verification threshold of 70%.',
    status: 'PENDING',
    detectedAt: '2026-09-07T18:02:05Z',
    createdAt: '2026-09-07T18:02:18Z',
  },
  {
    id: 'alert-2',
    caseId: 'case-SSB1028',
    caseNumber: 'SSB-1028',
    officerId: 'officer-2',
    officerName: 'Priya Sharma',
    alertType: 'OCR_INCONSISTENCY',
    severity: 'MEDIUM',
    reason: 'OCR confidence (62.4%) is below acceptable threshold. Multiple field confidence scores are low.',
    status: 'PENDING',
    detectedAt: '2026-09-07T16:30:22Z',
    createdAt: '2026-09-07T16:45:00Z',
  },
  {
    id: 'alert-3',
    caseId: 'case-SSB1026',
    caseNumber: 'SSB-1026',
    officerId: 'officer-1',
    officerName: 'Rajesh Kumar',
    alertType: 'TAMPERING_DETECTED',
    severity: 'HIGH',
    reason: 'Document tampering analysis detected metadata inconsistency with 68.5% confidence.',
    status: 'REVIEWED',
    detectedAt: '2026-09-07T10:25:00Z',
    createdAt: '2026-09-07T10:30:00Z',
  },
  {
    id: 'alert-4',
    caseId: 'case-SSB1023',
    caseNumber: 'SSB-1023',
    officerId: 'officer-2',
    officerName: 'Priya Sharma',
    alertType: 'SUSPICIOUS_IDENTITY',
    severity: 'CRITICAL',
    reason: 'Multiple verification layers failed. Documents are inconsistent across all checks.',
    status: 'REVIEWED',
    detectedAt: '2026-09-07T12:10:00Z',
    createdAt: '2026-09-07T12:15:00Z',
  },
];

// ── Audit Logs ─────────────────────────────────────────────────

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    caseId: 'case-SSB1025',
    action: 'CASE_CREATED',
    actorId: 'officer-1',
    actorName: 'Rajesh Kumar',
    details: { caseNumber: 'SSB-1025', title: 'Identity Verification — Arjun Verma' },
    eventHash: '7a82f91bc3d4e5678901234567890abc1234def56789012345678901234567890',
    txId: '0x7a920f8c1b3d4e5a2c6f890ab12345678901234567890abcdef1234567890f81c',
    blockNumber: 182,
    createdAt: '2026-09-07T17:40:00Z',
  },
  {
    id: 'audit-2',
    caseId: 'case-SSB1025',
    action: 'DOCUMENT_UPLOADED',
    actorId: 'officer-1',
    actorName: 'Rajesh Kumar',
    details: { fileName: 'passport_arjun_verma.jpg', docType: 'PASSPORT', sha256: 'c72d8e1f...12345' },
    eventHash: '8b93a02cd4e5f6789012345678901bcd2345ef67890123456789012345678901',
    txId: '0x8b931a2d4e5f6c8a0b2d4e6890ab123456789012abcdef34567890abcdef2345',
    blockNumber: 183,
    createdAt: '2026-09-07T17:40:48Z',
  },
  {
    id: 'audit-3',
    caseId: 'case-SSB1025',
    action: 'OCR_COMPLETED',
    actorId: 'system',
    actorName: 'AI System',
    details: { confidence: 62.4, warnings: 2, fieldsExtracted: 8 },
    eventHash: '9c04b13de5f6789012345678901cde3456f0789012345678901234567890123',
    txId: '0x9c042b3e5f6a7d9c1e3f5890bc2345678901234bcdef456789012bcdef123456',
    blockNumber: 184,
    createdAt: '2026-09-07T17:41:20Z',
  },
  {
    id: 'audit-4',
    caseId: 'case-SSB1025',
    action: 'FACE_VERIFICATION',
    actorId: 'system',
    actorName: 'AI System',
    details: { similarity: 38.2, liveness: 91.4, result: 'NO_MATCH' },
    eventHash: 'ad15c24ef6789012345678901def4567890123456789012345678901234567890',
    txId: '0xad152c4f6a7b8d0e2f4690cd3456789012345cdef5678901234cdef234567890',
    blockNumber: 185,
    createdAt: '2026-09-07T17:45:10Z',
  },
  {
    id: 'audit-5',
    caseId: 'case-SSB1025',
    action: 'CASE_FLAGGED',
    actorId: 'officer-1',
    actorName: 'Rajesh Kumar',
    details: { reason: 'FACE_MISMATCH', observations: 'Face similarity critically low (38.2%). Possible document forgery.' },
    eventHash: 'be26d35f0789012345678901ef05678901234567890123456789012345678901',
    txId: '0xbe263d5a7b8c9e1f3a5790de4567890123456def6789012345def345678901234',
    blockNumber: 186,
    createdAt: '2026-09-07T18:02:18Z',
  },
  {
    id: 'audit-6',
    caseId: 'case-SSB1025',
    action: 'ADMIN_REVIEW_STARTED',
    actorId: 'admin-1',
    actorName: 'Anil Sharma',
    details: { reviewStartedAt: '2026-09-07T18:03:02Z' },
    eventHash: 'cf37e46a1890123456789012f016789012345678901234567890123456789012',
    txId: '0xcf374e6b8c9d0f2a4b6891ef5678901234567ef0789012345ef456789012345',
    blockNumber: 187,
    createdAt: '2026-09-07T18:03:02Z',
  },
];

// ── Notifications ──────────────────────────────────────────────

export const mockOfficerNotifications: Notification[] = [
  {
    id: 'notif-o1',
    title: 'OCR Completed',
    message: 'OCR extraction completed for case SSB-1025 with 62.4% confidence.',
    type: 'WARNING',
    read: false,
    createdAt: '2026-09-07T17:41:20Z',
    href: '/officer/cases/case-SSB1025',
  },
  {
    id: 'notif-o2',
    title: 'Face Verification Complete',
    message: 'Face verification for SSB-1025 returned NO MATCH (38.2% similarity).',
    type: 'DANGER',
    read: false,
    createdAt: '2026-09-07T17:45:10Z',
    href: '/officer/cases/case-SSB1025',
  },
  {
    id: 'notif-o3',
    title: 'Case Submitted',
    message: 'Case SSB-1021 has been successfully submitted and approved.',
    type: 'SUCCESS',
    read: true,
    createdAt: '2026-09-07T17:15:00Z',
    href: '/officer/cases/case-SSB1021',
  },
  {
    id: 'notif-o4',
    title: 'Case Status Changed',
    message: 'Case SSB-1025 has been flagged for admin review.',
    type: 'WARNING',
    read: true,
    createdAt: '2026-09-07T18:02:18Z',
    href: '/officer/cases/case-SSB1025',
  },
];

export const mockAdminNotifications: Notification[] = [
  {
    id: 'notif-a1',
    title: 'New Flagged Case',
    message: 'Officer Rajesh Kumar has flagged case SSB-1025 for admin review.',
    type: 'DANGER',
    read: false,
    createdAt: '2026-09-07T18:02:18Z',
    href: '/admin/cases/case-SSB1025',
  },
  {
    id: 'notif-a2',
    title: 'High-Risk Alert',
    message: 'Face mismatch detected in SSB-1025. Similarity score: 38.2%.',
    type: 'DANGER',
    read: false,
    createdAt: '2026-09-07T18:02:05Z',
    href: '/admin/alerts',
  },
  {
    id: 'notif-a3',
    title: 'Officer Referral',
    message: 'SSB-1028 has been referred for secondary review — OCR inconsistency.',
    type: 'WARNING',
    read: false,
    createdAt: '2026-09-07T16:45:00Z',
    href: '/admin/cases/case-SSB1028',
  },
  {
    id: 'notif-a4',
    title: 'Pending Manual Review',
    message: '2 cases are currently pending admin review.',
    type: 'INFO',
    read: true,
    createdAt: '2026-09-07T16:00:00Z',
    href: '/admin/cases',
  },
];

// ── Activity Feed ─────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  time: string;
  description: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
}

export const mockOfficerActivity: ActivityItem[] = [
  { id: 'act-1', time: '18:02', description: 'Face verification completed — NO MATCH (SSB-1025)', type: 'DANGER' },
  { id: 'act-2', time: '18:01', description: 'Passport uploaded for SSB-1025', type: 'INFO' },
  { id: 'act-3', time: '17:59', description: 'OCR extraction completed — 96.8% confidence (SSB-1021)', type: 'SUCCESS' },
  { id: 'act-4', time: '17:56', description: 'New verification case SSB-1025 created', type: 'INFO' },
  { id: 'act-5', time: '17:45', description: 'Case SSB-1021 passed initial screening', type: 'SUCCESS' },
  { id: 'act-6', time: '17:15', description: 'Case SSB-1021 approved', type: 'SUCCESS' },
  { id: 'act-7', time: '15:10', description: 'Document uploaded for SSB-1030', type: 'INFO' },
];

export const mockAdminActivity: ActivityItem[] = [
  { id: 'act-a1', time: '18:03', description: 'Admin review started for SSB-1025', type: 'INFO' },
  { id: 'act-a2', time: '18:02', description: 'New anomaly detected — Face mismatch in SSB-1025', type: 'DANGER' },
  { id: 'act-a3', time: '17:02', description: 'Officer Rajesh Kumar referred case SSB-1025', type: 'WARNING' },
  { id: 'act-a4', time: '16:45', description: 'Case SSB-1028 flagged for OCR review', type: 'WARNING' },
  { id: 'act-a5', time: '13:00', description: 'Decision recorded — SSB-1023 REJECTED', type: 'DANGER' },
  { id: 'act-a6', time: '11:30', description: 'Case SSB-1024 approved', type: 'SUCCESS' },
];
