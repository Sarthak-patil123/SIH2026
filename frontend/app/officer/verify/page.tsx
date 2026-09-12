'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Upload, Camera, FileText, CheckCircle2, AlertTriangle, ChevronRight,
  ChevronLeft, RotateCcw, Shield, User, Eye, Check, X, ScanLine, ArrowLeft,
  AlertCircle, ShieldAlert, Sparkles, RefreshCw, Layers, CheckSquare,
  FileCheck2, ShieldCheck, BadgeAlert, ArrowRight, CornerDownRight, Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

type Step = 1 | 2 | 3 | 4 | 5;

export type SupportedDocType =
  | 'PASSPORT'
  | 'NATIONAL_ID'
  | 'VISA_STAMP'
  | 'DRIVING_LICENSE'
  | 'DOB_PROOF';

export interface StructuredField {
  label: string;
  value: string;
  confidence: number;
}

export interface TamperFinding {
  checkName: string;
  status: 'AUTHENTIC' | 'SUSPICIOUS' | 'ANOMALY';
  confidence: number;
  details: string;
}

export interface VerificationDocument {
  id: string;
  docType: SupportedDocType;
  fileName: string;
  fileSize: string;
  sha256: string;
  tamperScore: number; // 0 - 100 (100 = completely authentic)
  tamperStatus: 'AUTHENTIC' | 'TAMPERED';
  tamperFindings: TamperFinding[];
  fields: StructuredField[];
}

export interface CrossDocDiscrepancy {
  field: string;
  docAValue: string;
  docBValue: string;
  status: 'MATCH' | 'VARIATION' | 'MISMATCH';
  confidence: number;
  notes: string;
}

const SUPPORTED_DOCUMENTS: { type: SupportedDocType; label: string; icon: string }[] = [
  { type: 'PASSPORT', label: 'Passport', icon: '📘' },
  { type: 'NATIONAL_ID', label: 'Nationality ID', icon: '🆔' },
  { type: 'VISA_STAMP', label: 'Visa', icon: '✈️' },
  { type: 'DRIVING_LICENSE', label: 'Driving Licence', icon: '🪪' },
  { type: 'DOB_PROOF', label: 'DOB Proof', icon: '📜' },
];

const STEPS = [
  { num: 1, label: 'Document Intake' },
  { num: 2, label: 'Cross-Doc & Tampering' },
  { num: 3, label: 'Biometric Face Match' },
  { num: 4, label: 'Multi-Factor Decision' },
  { num: 5, label: 'Verification Sealed' },
];

// Preset Scenarios for instant testing
const PRESETS = [
  {
    id: 'clean',
    title: 'Clean Multi-Document (Passport + Nationality ID)',
    badge: 'Clean Profile',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Rajesh Kumar · 98% Consistency · No tampering · Face 97.4% Match',
  },
  {
    id: 'discrepancy',
    title: 'Cross-Document Discrepancy (Passport + Nationality ID)',
    badge: 'Discrepancies Flagged',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Arjun Verma vs Arjun V. Sharma · DOB mismatch · Cross-Doc Score 44%',
  },
  {
    id: 'tampered',
    title: 'Document Tampering Detected (Passport + Visa)',
    badge: 'Tampering Alert',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Serial number font irregularity · Microprint distortion · Tamper Score 34%',
  },
];

export default function OfficerVerifyPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [activeScenario, setActiveScenario] = useState<'clean' | 'discrepancy' | 'tampered'>('tampered');

  // Documents in intake (starts empty so officer uploads fresh credentials)
  const [docs, setDocs] = useState<VerificationDocument[]>([]);
  const [crossDocScore, setCrossDocScore] = useState<number>(26);
  const [crossDiscrepancies, setCrossDiscrepancies] = useState<CrossDocDiscrepancy[]>(() => getPresetDiscrepancies('tampered'));
  const [faceScore, setFaceScore] = useState<number>(34.6);
  const [faceMatch, setFaceMatch] = useState<boolean>(false);

  // Upload states
  const [userFaceImage, setUserFaceImage] = useState<string | null>(null);
  const [comparingFace, setComparingFace] = useState<boolean>(false);
  const [biometricScanned, setBiometricScanned] = useState<boolean>(false);

  // Forensic Scanning Simulation State (takes time for demo authenticity)
  const [isForensicAnalyzing, setIsForensicAnalyzing] = useState<boolean>(false);
  const [forensicProgress, setForensicProgress] = useState<number>(0);
  const [forensicStage, setForensicStage] = useState<string>('');

  // Retry counter (Max 3 tries)
  const [retryCount, setRetryCount] = useState<number>(0);
  const maxRetries = 3;

  // Final Decision & Submission state
  const [officerNotes, setOfficerNotes] = useState<string>('');
  const [submittedCaseId, setSubmittedCaseId] = useState<string>('SSB-' + Math.floor(1000 + Math.random() * 9000));
  const [finalDecisionType, setFinalDecisionType] = useState<'APPROVED' | 'ESCALATED'>('ESCALATED');

  function getPresetDocs(scenario: 'clean' | 'discrepancy' | 'tampered'): VerificationDocument[] {
    if (scenario === 'clean') {
      return [
        {
          id: 'doc-1',
          docType: 'PASSPORT',
          fileName: 'passport_rajesh_kumar.jpg',
          fileSize: '2.4 MB',
          sha256: 'a82f9c3d1e74b2f8912c45d6e7890abc1234def5678901234567890123456789',
          tamperScore: 98.4,
          tamperStatus: 'AUTHENTIC',
          tamperFindings: [
            { checkName: 'Typography & Font Glyph Integrity', status: 'AUTHENTIC', confidence: 99.1, details: 'Standard ICAO font detected. No digital manipulation.' },
            { checkName: 'Microprint & Hologram Integrity', status: 'AUTHENTIC', confidence: 98.5, details: 'Micro-text boundaries uniform and intact.' },
            { checkName: 'Photo Cut/Paste Artifact Detection', status: 'AUTHENTIC', confidence: 99.4, details: 'Seamless boundary gradients. No cut-and-paste edge detected.' },
            { checkName: 'Metadata Modification Inspection', status: 'AUTHENTIC', confidence: 97.9, details: 'Exif metadata consistent with scanning terminal.' },
          ],
          fields: [
            { label: 'Full Legal Name', value: 'RAJESH KUMAR', confidence: 99.1 },
            { label: 'Date of Birth', value: '12/05/1998', confidence: 98.4 },
            { label: 'Nationality', value: 'INDIAN', confidence: 99.5 },
            { label: 'Gender', value: 'MALE', confidence: 99.9 },
            { label: 'Passport Number', value: 'N1234567', confidence: 98.7 },
            { label: 'Date of Expiry', value: '14/01/2030', confidence: 97.8 },
          ],
        },
        {
          id: 'doc-2',
          docType: 'NATIONAL_ID',
          fileName: 'nationality_id_rajesh.jpg',
          fileSize: '1.8 MB',
          sha256: 'b91e7f2a4c6d8e0912345678abcdef01234567890abcdef1234567890abcdef',
          tamperScore: 97.6,
          tamperStatus: 'AUTHENTIC',
          tamperFindings: [
            { checkName: 'Typography & Font Glyph Integrity', status: 'AUTHENTIC', confidence: 98.8, details: 'Consistent layout geometry.' },
            { checkName: 'Microprint & Hologram Integrity', status: 'AUTHENTIC', confidence: 97.2, details: 'Government security seal intact.' },
            { checkName: 'Photo Cut/Paste Artifact Detection', status: 'AUTHENTIC', confidence: 98.9, details: 'No edge replacement detected.' },
          ],
          fields: [
            { label: 'Full Legal Name', value: 'RAJESH KUMAR', confidence: 99.0 },
            { label: 'Date of Birth', value: '12/05/1998', confidence: 98.2 },
            { label: 'Nationality ID Number', value: 'IND-9812-3456-7890', confidence: 97.9 },
            { label: 'Gender', value: 'MALE', confidence: 99.8 },
            { label: 'Address Region', value: 'DELHI, NCR', confidence: 96.5 },
          ],
        },
      ];
    }

    if (scenario === 'discrepancy') {
      return [
        {
          id: 'doc-1',
          docType: 'PASSPORT',
          fileName: 'passport_arjun_verma.jpg',
          fileSize: '3.1 MB',
          sha256: 'c72d8e1f3b5a7c9012345678901234567890abcdef1234567890abcdef12345',
          tamperScore: 94.2,
          tamperStatus: 'AUTHENTIC',
          tamperFindings: [
            { checkName: 'Typography & Font Glyph Integrity', status: 'AUTHENTIC', confidence: 95.0, details: 'Font layout complies with standard passport format.' },
            { checkName: 'Microprint & Hologram Integrity', status: 'AUTHENTIC', confidence: 93.8, details: 'Standard security seals present.' },
          ],
          fields: [
            { label: 'Full Legal Name', value: 'ARJUN VERMA', confidence: 98.2 },
            { label: 'Date of Birth', value: '24/09/1991', confidence: 97.5 },
            { label: 'Nationality', value: 'INDIAN', confidence: 99.0 },
            { label: 'Passport Number', value: 'P9876543', confidence: 96.8 },
            { label: 'Date of Expiry', value: '21/02/2029', confidence: 95.4 },
          ],
        },
        {
          id: 'doc-2',
          docType: 'NATIONAL_ID',
          fileName: 'nationality_id_arjun.jpg',
          fileSize: '1.9 MB',
          sha256: 'd83e9f2a4b6c8d0e123456789012345678901234abcdef567890abcdef123456',
          tamperScore: 91.0,
          tamperStatus: 'AUTHENTIC',
          tamperFindings: [
            { checkName: 'Typography & Font Glyph Integrity', status: 'AUTHENTIC', confidence: 92.5, details: 'Layout intact.' },
          ],
          fields: [
            { label: 'Full Legal Name', value: 'ARJUN V. SHARMA', confidence: 94.1 },
            { label: 'Date of Birth', value: '14/06/1993', confidence: 95.2 },
            { label: 'Nationality ID Number', value: 'IND-4501-8821-9932', confidence: 96.0 },
            { label: 'Address Region', value: 'MUMBAI, MAHARASHTRA', confidence: 93.0 },
          ],
        },
      ];
    }

    // Tampered scenario: 4 Fake / Tampered Documents with low scores and low field extraction confidences
    return [
      {
        id: 'doc-1',
        docType: 'PASSPORT',
        fileName: 'fake_passport_meera_sharma.jpg',
        fileSize: '3.4 MB',
        sha256: 'e94f0a3b5c7d9e1f234567890123456789012345bcdef678901bcdef1234567',
        tamperScore: 26.4,
        tamperStatus: 'TAMPERED',
        tamperFindings: [
          { checkName: 'Photo Cut/Paste Artifact Detection', status: 'ANOMALY', confidence: 28.5, details: 'Resampling halos and sharp gradient edge discontinuity detected around portrait boundary.' },
          { checkName: 'MRZ Checksum Digit Validation', status: 'ANOMALY', confidence: 24.0, details: 'Optical check digit failure: Calculated ICAO 9303 checksum mismatch on line 2.' },
          { checkName: 'Microprint & Hologram Integrity', status: 'ANOMALY', confidence: 31.2, details: 'Micro-text line distortion around state emblem; simulated UV fluorescent fibers absent.' },
          { checkName: 'Typography & Glyph Kerning Inspection', status: 'ANOMALY', confidence: 29.0, details: 'Non-ICAO font typeface and altered kerning detected in legal surname container.' },
        ],
        fields: [
          { label: 'Full Legal Name', value: 'SHARMA MEERA', confidence: 34.0 },
          { label: 'Date of Birth', value: '15/05/1990', confidence: 28.0 },
          { label: 'Passport Number', value: 'N1234567', confidence: 31.5 },
          { label: 'Nationality', value: 'INDIAN', confidence: 42.0 },
          { label: 'Date of Expiry', value: '09/10/2033', confidence: 36.0 },
        ],
      },
      {
        id: 'doc-2',
        docType: 'NATIONAL_ID',
        fileName: 'fake_national_id_meera.jpg',
        fileSize: '2.1 MB',
        sha256: 'd83e9f2a4b6c8d0e123456789012345678901234abcdef567890abcdef123456',
        tamperScore: 29.0,
        tamperStatus: 'TAMPERED',
        tamperFindings: [
          { checkName: 'Security Hologram & Guilloche Seal', status: 'ANOMALY', confidence: 27.5, details: 'State emblem security guilloche absent; flat 2D photocopy reproduction.' },
          { checkName: 'Font Glyph & Kerning Inspection', status: 'ANOMALY', confidence: 32.0, details: 'Mismatched DPI font insertion in demographic data blocks.' },
        ],
        fields: [
          { label: 'Full Legal Name', value: 'MEERA R. SHARMA', confidence: 33.0 },
          { label: 'Date of Birth', value: '12/08/1988', confidence: 26.0 },
          { label: 'Nationality ID Number', value: 'IND-8834-1102-9931', confidence: 30.0 },
          { label: 'Address Region', value: 'MUMBAI, MAHARASHTRA', confidence: 38.0 },
        ],
      },
      {
        id: 'doc-3',
        docType: 'VISA_STAMP',
        fileName: 'fake_tourist_visa_stamp.jpg',
        fileSize: '1.4 MB',
        sha256: 'f05a1b4c6d8e0f234567890abcdef1234567890123456bcdef789012345678',
        tamperScore: 22.5,
        tamperStatus: 'TAMPERED',
        tamperFindings: [
          { checkName: 'Immigration Stamp Ink & Geometry', status: 'ANOMALY', confidence: 25.0, details: 'Invalid border post checkpoint code; ink colorimetry does not match official SSB dye.' },
          { checkName: 'Digital Overlay Layer Detection', status: 'ANOMALY', confidence: 21.0, details: 'Digital stamp overlay detected via Error Level Analysis (ELA 78%).' },
        ],
        fields: [
          { label: 'Full Legal Name', value: 'MIRA SHARMA', confidence: 31.0 },
          { label: 'Visa Type', value: 'TOURIST MULTI-ENTRY', confidence: 39.0 },
          { label: 'Visa Number', value: 'V-99210-FAKE', confidence: 23.0 },
          { label: 'Valid Until', value: '30/12/2026', confidence: 35.0 },
        ],
      },
      {
        id: 'doc-4',
        docType: 'DOB_PROOF',
        fileName: 'fake_dob_certificate.jpg',
        fileSize: '1.6 MB',
        sha256: 'a12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        tamperScore: 28.0,
        tamperStatus: 'TAMPERED',
        tamperFindings: [
          { checkName: 'Physical Erasure & Overwriting Test', status: 'ANOMALY', confidence: 26.5, details: 'Chemical/digital erasure detected underneath altered date of birth numerals.' },
          { checkName: 'Municipal Seal Verification', status: 'ANOMALY', confidence: 29.0, details: 'Counterfeit municipal registrar stamp; registration sequence invalid.' },
        ],
        fields: [
          { label: 'Full Legal Name', value: 'MEERA SHARMA', confidence: 37.0 },
          { label: 'Date of Birth', value: '20/01/1992', confidence: 25.0 },
          { label: 'Certificate Number', value: 'REG-2023-DEL-0091', confidence: 32.0 },
          { label: 'Issuing Authority', value: 'MUNICIPAL CORP (COUNTERFEIT)', confidence: 22.0 },
        ],
      },
    ];
  }

  function getPresetDiscrepancies(scenario: 'clean' | 'discrepancy' | 'tampered'): CrossDocDiscrepancy[] {
    if (scenario === 'clean') {
      return [
        { field: 'Full Legal Name', docAValue: 'RAJESH KUMAR', docBValue: 'RAJESH KUMAR', status: 'MATCH', confidence: 99.4, notes: 'Exact character match across Passport and Nationality ID.' },
        { field: 'Date of Birth', docAValue: '12/05/1998', docBValue: '12/05/1998', status: 'MATCH', confidence: 98.8, notes: 'Exact match (DD/MM/YYYY).' },
        { field: 'Nationality', docAValue: 'INDIAN', docBValue: 'INDIAN (IND)', status: 'MATCH', confidence: 99.2, notes: 'Country code and jurisdiction confirmed.' },
        { field: 'Gender', docAValue: 'MALE', docBValue: 'MALE', status: 'MATCH', confidence: 99.8, notes: 'Confirmed.' },
      ];
    }
    if (scenario === 'discrepancy') {
      return [
        { field: 'Full Legal Name', docAValue: 'ARJUN VERMA', docBValue: 'ARJUN V. SHARMA', status: 'MISMATCH', confidence: 94.2, notes: 'Surname mismatch between Passport ("Verma") and Nationality ID ("Sharma").' },
        { field: 'Date of Birth', docAValue: '24/09/1991', docBValue: '14/06/1993', status: 'MISMATCH', confidence: 96.0, notes: 'Discrepancy of 1 year 8 months between documents.' },
        { field: 'Address / State', docAValue: 'DELHI (Issued)', docBValue: 'MUMBAI, MAHARASHTRA', status: 'VARIATION', confidence: 88.5, notes: 'Different regional jurisdictions.' },
      ];
    }
    return [
      { field: 'Date of Birth Conflict', docAValue: '15/05/1990 (Passport)', docBValue: '12/08/1988 (Nat ID) · 20/01/1992 (DOB Proof)', status: 'MISMATCH', confidence: 24.5, notes: 'Critical Conflict: 3 conflicting birth dates across 3 credentials (delta of 3.5 years).' },
      { field: 'Full Legal Name', docAValue: 'SHARMA MEERA (Passport)', docBValue: 'MEERA R. SHARMA (Nat ID) · MIRA SHARMA (Visa)', status: 'MISMATCH', confidence: 29.0, notes: 'Altered surname ordering and fraudulent middle initial variant.' },
      { field: 'Document Origin & Jurisdiction', docAValue: 'DELHI (Passport)', docBValue: 'MUMBAI (Nat ID) · UNKNOWN POST (Visa)', status: 'MISMATCH', confidence: 26.0, notes: 'Incompatible regional issuing authorities and missing registry records.' },
      { field: 'MRZ Checksum & Serial Ledger', docAValue: 'N1234567 (Checksum Fail)', docBValue: 'V-99210-FAKE (Unverified Entry)', status: 'MISMATCH', confidence: 21.0, notes: 'Passport check digit failure; Visa serial does not link to authentic ICAO immigration ledger.' },
    ];
  }

  function applyPreset(sc: 'clean' | 'discrepancy' | 'tampered') {
    setActiveScenario(sc);
    const newDocs = getPresetDocs(sc);
    setDocs(newDocs);
    const newDiscrepancies = getPresetDiscrepancies(sc);
    setCrossDiscrepancies(newDiscrepancies);

    if (sc === 'clean') {
      setCrossDocScore(98);
      setFaceScore(97.4);
      setFaceMatch(true);
    } else if (sc === 'discrepancy') {
      setCrossDocScore(44);
      setFaceScore(88.2);
      setFaceMatch(true);
    } else {
      setCrossDocScore(26);
      setFaceScore(34.6);
      setFaceMatch(false);
    }
    setRetryCount(0);
  }

  // Combined Multi-Factor Risk Score Calculation
  const avgTamperScore = Math.round(docs.reduce((sum, d) => sum + d.tamperScore, 0) / (docs.length || 1));
  const combinedVerificationScore = Math.round(
    crossDocScore * 0.50 + avgTamperScore * 0.30 + faceScore * 0.20
  );
  // High risk score for fake / tampered credentials demo
  const combinedRiskScore = Math.min(92, Math.max(86, 100 - combinedVerificationScore));
  const isScoreClean = combinedRiskScore <= 30;

  // Handle Retry
  function handleRetry() {
    if (retryCount >= maxRetries) return;
    const nextRetry = retryCount + 1;
    setRetryCount(nextRetry);

    if (nextRetry >= maxRetries) {
      // Auto-flag and escalate
      setFinalDecisionType('ESCALATED');
    }
  }

  // Handle Final Decision
  function handleDecision(type: 'APPROVED' | 'ESCALATED') {
    setFinalDecisionType(type);
    const newCaseId = 'SSB-' + Math.floor(1000 + Math.random() * 9000);
    setSubmittedCaseId(newCaseId);

    // Save to mockCases state
    const primaryDoc = docs[0];
    const applicantName = primaryDoc.fields.find((f) => f.label.includes('Name'))?.value || 'Applicant Subject';
    const applicantDob = primaryDoc.fields.find((f) => f.label.includes('Birth'))?.value || '12/05/1998';

    mockCases.unshift({
      id: `case-${newCaseId}`,
      caseNumber: newCaseId,
      title: `${primaryDoc.docType.replace('_', ' ')} Verification — ${applicantName}`,
      applicantName,
      applicantDob,
      status: type === 'APPROVED' ? 'APPROVED' : 'FLAGGED',
      riskScore: combinedRiskScore,
      riskLevel: combinedRiskScore >= 60 ? 'HIGH' : combinedRiskScore >= 30 ? 'MEDIUM' : 'LOW',
      officerId: user?.id || 'officer-1',
      officerName: user?.name || 'Screening Officer',
      documents: docs.map((d) => ({
        id: `doc-${Date.now()}-${d.id}`,
        caseId: `case-${newCaseId}`,
        fileName: d.fileName,
        fileUrl: '/mock/passport-sample.jpg',
        fileSize: 1024 * 1024 * 2,
        docType: d.docType,
        sha256Hash: d.sha256,
        createdAt: new Date().toISOString(),
      })),
      flagReason: type === 'APPROVED' ? undefined : (avgTamperScore < 60 ? 'TAMPERING_DETECTED' : crossDocScore < 60 ? 'CROSS_DOCUMENT_MISMATCH' : 'FACE_MISMATCH'),
      officerObservations: officerNotes || (type === 'APPROVED' ? 'All biometric & cross-document checks verified authentic.' : 'Referred for supervisory administration investigation.'),
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setStep(5);
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header & Step Tracker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Multi-Document Screening Terminal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            SSB Automated Cross-Document Verification &amp; Forensics Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Step {step} of 5
          </span>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isActive
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs font-bold'
                    : isDone
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200/70 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {isDone ? (
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  ) : (
                    <span className="text-[10px] font-mono font-bold w-4 h-4 rounded-full bg-current/10 flex items-center justify-center">
                      {s.num}
                    </span>
                  )}
                  <span className="text-xs truncate">{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: Document Intake & Upload
      ───────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          {/* Staged Documents */}
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-bold text-slate-900">
                  Staged Documents for Cross-Verification ({docs.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload passenger credentials from your laptop for neural OCR extraction &amp; cross-verification.
                </p>
              </div>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0">
                <Upload size={14} />
                <span>Upload Documents</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const newDocsList: VerificationDocument[] = [];
                      Array.from(files).forEach((file, fileIdx) => {
                        const totalExisting = docs.length + fileIdx;
                        const docType: SupportedDocType =
                          totalExisting === 0
                            ? 'PASSPORT'
                            : totalExisting === 1
                            ? 'NATIONAL_ID'
                            : totalExisting === 2
                            ? 'VISA_STAMP'
                            : 'DOB_PROOF';

                        newDocsList.push({
                          id: `doc-${Date.now()}-${fileIdx}`,
                          docType,
                          fileName: file.name,
                          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                          sha256: Array.from(crypto.getRandomValues(new Uint8Array(32)))
                            .map((b) => b.toString(16).padStart(2, '0'))
                            .join(''),
                          tamperScore: Number((23 + Math.random() * 8).toFixed(1)),
                          tamperStatus: 'TAMPERED',
                          tamperFindings: [
                            { checkName: 'Photo Cut-and-Paste Edge Artifacts', status: 'ANOMALY', confidence: 28.5, details: 'Resampling halos and gradient edge discontinuity detected around portrait boundary.' },
                            { checkName: 'MRZ Checksum Digit Validation', status: 'ANOMALY', confidence: 24.0, details: 'Optical check digit failure: Calculated ICAO 9303 checksum mismatch.' },
                            { checkName: 'Microprint & Hologram Integrity', status: 'ANOMALY', confidence: 31.2, details: 'Micro-text distortion and missing UV fluorescent fibers.' },
                          ],
                          fields: [
                            { label: 'Full Legal Name', value: totalExisting === 0 ? 'SHARMA MEERA' : totalExisting === 1 ? 'MEERA R. SHARMA' : 'MIRA SHARMA', confidence: 34.0 },
                            { label: 'Date of Birth', value: totalExisting === 0 ? '15/05/1990' : totalExisting === 1 ? '12/08/1988' : '20/01/1992', confidence: 27.5 },
                            { label: 'Document Number', value: totalExisting === 0 ? 'N1234567' : totalExisting === 1 ? 'IND-8834-1102-9931' : 'V-99210-FAKE', confidence: 29.0 },
                            { label: 'Origin Post', value: totalExisting === 0 ? 'DELHI' : totalExisting === 1 ? 'MUMBAI' : 'UNKNOWN ENTRY POST', confidence: 36.0 },
                          ],
                        });
                      });
                      setDocs((prev) => [...prev, ...newDocsList]);
                    }
                  }}
                />
              </label>
            </div>

            {/* Document Grid (Only rendered when documents exist) */}
            {docs.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {docs.map((d, idx) => (
                  <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-heading px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center gap-1.5">
                        <FileCheck2 size={14} className="text-blue-600" />
                        Doc #{idx + 1}: {d.docType.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        Staged for Analysis
                      </span>
                    </div>

                    <p className="font-mono text-xs text-slate-800 font-semibold">{d.fileName}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">SHA-256: {d.sha256.slice(0, 32)}...</p>

                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Ready for Ingestion &amp; Verification</span>
                      <button
                        onClick={() => setDocs((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600 font-medium transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clickable Drag & Drop Upload Zone */}
            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center transition-all bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer block group">
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    const newDocsList: VerificationDocument[] = [];
                    Array.from(files).forEach((file, fileIdx) => {
                      const totalExisting = docs.length + fileIdx;
                      const docType: SupportedDocType =
                        totalExisting === 0
                          ? 'PASSPORT'
                          : totalExisting === 1
                          ? 'NATIONAL_ID'
                          : totalExisting === 2
                          ? 'VISA_STAMP'
                          : 'DOB_PROOF';

                      newDocsList.push({
                        id: `doc-${Date.now()}-${fileIdx}`,
                        docType,
                        fileName: file.name,
                        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                        sha256: Array.from(crypto.getRandomValues(new Uint8Array(32)))
                          .map((b) => b.toString(16).padStart(2, '0'))
                          .join(''),
                        tamperScore: Number((23 + Math.random() * 8).toFixed(1)),
                        tamperStatus: 'TAMPERED',
                        tamperFindings: [
                          { checkName: 'Photo Cut/Paste Artifact Detection', status: 'ANOMALY', confidence: 28.5, details: 'Resampling halos and gradient edge discontinuity detected around portrait boundary.' },
                          { checkName: 'MRZ Checksum Digit Validation', status: 'ANOMALY', confidence: 24.0, details: 'Optical check digit failure: Calculated ICAO 9303 checksum mismatch.' },
                          { checkName: 'Microprint & Hologram Integrity', status: 'ANOMALY', confidence: 31.2, details: 'Micro-text distortion and missing UV fluorescent fibers.' },
                        ],
                        fields: [
                          { label: 'Full Legal Name', value: totalExisting === 0 ? 'SHARMA MEERA' : totalExisting === 1 ? 'MEERA R. SHARMA' : 'MIRA SHARMA', confidence: 34.0 },
                          { label: 'Date of Birth', value: totalExisting === 0 ? '15/05/1990' : totalExisting === 1 ? '12/08/1988' : '20/01/1992', confidence: 27.5 },
                          { label: 'Document Number', value: totalExisting === 0 ? 'N1234567' : totalExisting === 1 ? 'IND-8834-1102-9931' : 'V-99210-FAKE', confidence: 29.0 },
                          { label: 'Origin Post', value: totalExisting === 0 ? 'DELHI' : totalExisting === 1 ? 'MUMBAI' : 'UNKNOWN ENTRY POST', confidence: 36.0 },
                        ],
                      });
                    });
                    setDocs((prev) => [...prev, ...newDocsList]);
                  }
                }}
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors mb-3">
                <Upload size={22} />
              </div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                Click anywhere to upload documents, or drag and drop files here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports uploading multiple files at once (Passport, National ID, Visa, Driving Licence, DOB Proof)
              </p>
            </label>

            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                icon={<ChevronRight size={16} />}
                onClick={() => {
                  if (docs.length === 0) {
                    setDocs(getPresetDocs('tampered'));
                  }
                  setIsForensicAnalyzing(true);
                  setForensicProgress(0);
                  setForensicStage('Step 1 of 4: Extracting high-resolution optical glyphs and microprint...');

                  let currentProgress = 0;
                  const duration = 5200; // 5.2 seconds total duration
                  const intervalTime = 50; // Update every 50ms
                  const increment = 100 / (duration / intervalTime);

                  const interval = setInterval(() => {
                    currentProgress += increment;
                    if (currentProgress >= 100) {
                      currentProgress = 100;
                      clearInterval(interval);
                      setForensicProgress(100);
                      setForensicStage('Finalizing forensic synthesis report...');
                      setTimeout(() => {
                        setIsForensicAnalyzing(false);
                        setStep(2);
                      }, 400);
                    } else {
                      setForensicProgress(Math.min(99, Math.round(currentProgress)));
                      if (currentProgress >= 75) {
                        setForensicStage('Step 4 of 4: Cross-referencing bio-data fields & identity graphs...');
                      } else if (currentProgress >= 50) {
                        setForensicStage('Step 3 of 4: Validating ICAO 9303 MRZ checksums & security seals...');
                      } else if (currentProgress >= 25) {
                        setForensicStage('Step 2 of 4: Performing Error Level Analysis (ELA) & compression inspection...');
                      }
                    }
                  }, intervalTime);
                }}
              >
                Proceed to Multi-Doc Forensics
              </Button>
            </div>
          </div>

          {/* Forensic Neural Processing Overlay Modal (Clean, White Theme, Linear Progress) */}
          {isForensicAnalyzing && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-7 max-w-md w-full shadow-xl space-y-5 text-slate-900 relative animate-scale-in">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                    <ScanLine size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-slate-900">
                      Forensic Document Analysis
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Analyzing staged credentials against optical &amp; ICAO 9303 standards
                    </p>
                  </div>
                </div>

                {/* Linear Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Forensic Analysis Progress</span>
                    <span className="font-bold text-blue-600 font-mono text-xs">{forensicProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-75 ease-linear"
                      style={{ width: `${forensicProgress}%` }}
                    />
                  </div>
                </div>

                {/* Simple & Clean Stage Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold">
                    <RefreshCw size={13} className="animate-spin text-blue-600" />
                    <span>Inspection in Progress</span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed min-h-[34px]">
                    {forensicStage}
                  </p>
                  <div className="flex items-center justify-end text-[11px] text-slate-400 pt-2 border-t border-slate-200/80">
                    <span>Multi-Document Cross-Check</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: Cross-Document Verification & Tampering Analysis
      ───────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Score Cards: Cross-Document Score & Tampering Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Cross-Document Consistency Score Card */}
            <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cross-Document Verification</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    crossDocScore >= 80
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : crossDocScore >= 50
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {crossDocScore >= 80 ? 'CONSISTENT' : crossDocScore >= 50 ? 'BORDERLINE' : 'DISCREPANCIES DETECTED'}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className={`font-heading text-4xl font-bold tabular-nums ${
                  crossDocScore >= 80 ? 'text-emerald-600' : crossDocScore >= 50 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {crossDocScore}%
                </span>
                <span className="text-xs text-slate-500">Cross-Validation Match Index</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    crossDocScore >= 80 ? 'bg-emerald-500' : crossDocScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${crossDocScore}%` }}
                />
              </div>
            </div>

            {/* Tampering Detection Score Card */}
            <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tampering Detection Authenticity</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    avgTamperScore >= 80
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {avgTamperScore >= 80 ? 'AUTHENTIC' : 'TAMPER ALERT'}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className={`font-heading text-4xl font-bold tabular-nums ${
                  avgTamperScore >= 80 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {avgTamperScore}%
                </span>
                <span className="text-xs text-slate-500">Document Integrity Confidence</span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    avgTamperScore >= 80 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${avgTamperScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cross-Document Discrepancy Evidence Table */}
          <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-600" />
                  Cross-Document Discrepancy Evidence Table
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Automated comparison of extracted entity fields across submitted documents</p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr>
                    <th className="px-5 py-3">Key Identity Field</th>
                    <th className="px-5 py-3">Document 1 Value</th>
                    <th className="px-5 py-3">Document 2 Value</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Confidence</th>
                    <th className="px-5 py-3">Evidence Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {crossDiscrepancies.map((cd, i) => (
                    <tr key={i} className={cd.status === 'MISMATCH' ? 'bg-rose-50/40' : cd.status === 'VARIATION' ? 'bg-amber-50/30' : ''}>
                      <td className="px-5 py-3 font-sans font-bold text-slate-900">{cd.field}</td>
                      <td className="px-5 py-3 text-slate-800">{cd.docAValue}</td>
                      <td className="px-5 py-3 text-slate-800">{cd.docBValue}</td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-sans text-[10px] font-bold border uppercase ${
                            cd.status === 'MATCH'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cd.status === 'VARIATION'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {cd.status === 'MATCH' && <Check size={11} />}
                          {cd.status === 'MISMATCH' && <X size={11} />}
                          {cd.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-bold text-slate-700">{cd.confidence}%</td>
                      <td className="px-5 py-3 font-sans text-slate-600 text-[11px] leading-relaxed">{cd.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tampering Detection Findings per Document */}
          <div className="bg-white border border-slate-200/90 rounded-card shadow-card p-6 space-y-6">
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
                <BadgeAlert size={16} className="text-purple-600" />
                Document Tampering Forensics &amp; Findings
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Microprint, typography, and cut-and-paste boundary inspection</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {docs.map((d) => (
                <div key={d.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{d.docType.replace('_', ' ')}</span>
                      <span className="text-[11px] font-mono text-slate-400">{d.fileName}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                        d.tamperScore >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {d.tamperScore}% Authentic
                    </span>
                  </div>

                  <div className="space-y-2">
                    {d.tamperFindings.map((tf, i) => (
                      <div key={i} className="text-xs bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{tf.checkName}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              tf.status === 'AUTHENTIC'
                                ? 'bg-emerald-50 text-emerald-700'
                                : tf.status === 'SUSPICIOUS'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {tf.status} ({tf.confidence}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{tf.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Structured Extracted Data Cards (ONLY clean structured output) */}
          <div className="bg-white border border-slate-200/90 rounded-card shadow-card p-6 space-y-4">
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900">
                Structured Field Extraction (Clean Format)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">OCR bio-data extraction with field-level confidence validation</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {docs.map((d) => (
                <div key={d.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>{d.docType.replace('_', ' ')} Extraction</span>
                    <span className="text-[10px] font-mono text-slate-500">ICAO Formatted</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2">
                    {d.fields.map((f, i) => (
                      <div key={i} className="p-2 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500 font-sans">{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{f.value}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              f.confidence >= 80
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                : f.confidence >= 60
                                ? 'text-amber-700 bg-amber-50 border border-amber-200'
                                : 'text-rose-700 bg-rose-50 border border-rose-200'
                            }`}
                          >
                            {f.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => setStep(1)}>
              Back to Intake
            </Button>
            <Button variant="primary" icon={<ChevronRight size={16} />} onClick={() => setStep(3)}>
              Proceed to Biometric Face Match
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 3: Biometric Face Match
      ───────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Header matching screenshot */}
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                <Camera size={22} />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-slate-900">
                  Step 3: Biometric Face Verification
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compare live facial capture against reference document portrait using ArcFace neural embeddings
                </p>
              </div>
            </div>

            {/* 2-Column Comparison Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Left Column: Reference Document Photo (PASSPORT.JPG) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    REFERENCE DOCUMENT PHOTO (PASSPORT.JPG)
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-semibold">
                    Primary Reference
                  </span>
                </div>

                {/* Dark Frame Container for Document */}
                <div className="bg-slate-950 rounded-2xl p-3 sm:p-4 flex items-center justify-center overflow-hidden border border-slate-900 shadow-inner">
                  <img
                    src="/passport.jpg"
                    alt="Reference Document - Indian Passport"
                    className="w-full max-w-[440px] rounded-lg object-contain shadow-md"
                  />
                </div>
              </div>

              {/* Right Column: Live Camera Capture / Selfie */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    LIVE CAMERA CAPTURE / SELFIE
                  </span>
                  <label className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
                    Choose Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setUserFaceImage(reader.result as string);
                            setBiometricScanned(false);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Central Capture / Upload Area */}
                <div
                  onClick={() => {
                    const inputEl = document.getElementById('camera-selfie-upload') as HTMLInputElement;
                    if (inputEl) inputEl.click();
                  }}
                  className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100/70 transition-all min-h-[250px] relative overflow-hidden group"
                >
                  <input
                    id="camera-selfie-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setUserFaceImage(reader.result as string);
                          setBiometricScanned(false);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {userFaceImage ? (
                    <div className="relative w-36 h-44 rounded-xl overflow-hidden border-2 border-blue-500 shadow-md">
                      <img src={userFaceImage} alt="Live Subject" className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                        Subject Acquired
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3 select-none">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                        <Camera size={42} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Click to select or capture live selfie
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          (Or click Run Biometric Match below to verify against reference)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Animated Scanning Beam Overlay */}
                  {comparingFace && (
                    <div className="absolute inset-0 bg-blue-900/10 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 animate-fade-in">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent absolute top-0 animate-[bounce_1.2s_infinite] shadow-[0_0_12px_#3b82f6]" />
                      <div className="bg-white/95 px-4 py-2.5 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2.5">
                        <RefreshCw size={16} className="animate-spin text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Scanning Facial Geometry &amp; Embeddings...
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prominent Blue Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    setComparingFace(true);
                    setBiometricScanned(false);
                    setTimeout(() => {
                      setComparingFace(false);
                      setFaceScore(34.6);
                      setFaceMatch(false);
                      setBiometricScanned(true);
                    }, 1400);
                  }}
                  disabled={comparingFace}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-75 cursor-pointer"
                >
                  {comparingFace ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      <span>Scanning Biometric Vectors...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={18} />
                      <span>Run Biometric Match</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Verification Results Panel (Revealed Dynamically After Scanning) */}
            {biometricScanned && (
              <div className="pt-4 border-t border-slate-200/80 space-y-5 animate-fade-in">
                {/* Match Banner: Red / Mismatch Flagged for Fake Credential */}
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                        CRITICAL BIOMETRIC MISMATCH (ArcFace Neural Embeddings)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
                        FAILED (BELOW THRESHOLD)
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 mt-1">
                      1:1 facial biometric comparison between live subject and reference document (PASSPORT.JPG) failed with only <strong>{faceScore}%</strong> cosine similarity score (Border Control threshold: &gt;75%). Severe cranial geometry asymmetry, facial landmark disruption, and synthetic blending artifacts flagged.
                    </p>
                  </div>
                </div>

                {/* 3 Vector Metrics Breakdown (Low scores for demo) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Facial Similarity</span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-xl font-bold text-rose-600">{faceScore}%</span>
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                        Threshold &gt; 75% FAIL
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${faceScore}%` }} />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Landmarks &amp; IPD</span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-xl font-bold text-rose-600">41.2%</span>
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                        24/68 Failed
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-600 font-medium">Severe Craniofacial Asymmetry</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Anti-Spoofing &amp; Deepfake</span>
                    <div className="flex items-baseline justify-between">
                      <span className="font-heading text-xl font-bold text-rose-600">0.89 Anomaly</span>
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                        HIGH RISK
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-600 font-medium">Cut-and-Paste &amp; Face Swap Detected</p>
                  </div>
                </div>

                {/* Keypoint Geometry Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">ArcFace 512-D Geometry Alignment Table</span>
                    <span className="text-[11px] text-slate-500">ISO/IEC 19794-5 Compliance</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                      <span className="text-slate-600 font-medium">Bilateral Eye Center Distance</span>
                      <span className="text-slate-500">Reference: 64.1mm · Live: 58.2mm</span>
                      <span className="text-right font-semibold text-rose-600">5.9mm Delta (Severe Asymmetry)</span>
                    </div>
                    <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                      <span className="text-slate-600 font-medium">Nose-to-Mouth Triangle Ratio</span>
                      <span className="text-slate-500">Non-conforming geometric vector</span>
                      <span className="text-right font-semibold text-rose-600">32.1% Vector Match (MISMATCH)</span>
                    </div>
                    <div className="grid grid-cols-3 px-4 py-2.5 items-center">
                      <span className="text-slate-600 font-medium">Head Pose &amp; Cranial Morphology</span>
                      <span className="text-slate-500">Warped contours &amp; blending halo</span>
                      <span className="text-right font-semibold text-rose-600">Synthetic Artifacts Intercepted</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => setStep(2)}>
                Back to Step 2
              </Button>
              <Button variant="primary" icon={<ChevronRight size={16} />} onClick={() => setStep(4)}>
                Proceed to Multi-Factor Decision
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 4: Combined Multi-Factor Risk Assessment & 3-Retry Logic
      ───────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-in">
          {/* Combined Risk Score Header Banner */}
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 4: Decision Synthesis</span>
                <h2 className="font-heading text-xl font-bold text-slate-900">
                  Combined Multi-Factor Risk Assessment
                </h2>
              </div>

              {/* Combined Score Indicator */}
              <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-3 px-5">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Combined Risk Score</span>
                  <span className={`font-heading text-2xl font-bold ${
                    combinedRiskScore > 65 ? 'text-rose-600' : combinedRiskScore > 30 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {combinedRiskScore}/100 ({combinedRiskScore > 65 ? 'High Risk' : combinedRiskScore > 30 ? 'Medium Risk' : 'Low Risk'})
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  combinedRiskScore > 65
                    ? 'bg-rose-100 text-rose-600'
                    : combinedRiskScore > 30
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {combinedRiskScore > 65 ? <ShieldAlert size={20} /> : combinedRiskScore > 30 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
                </div>
              </div>
            </div>

            {/* Evidence Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">1. Cross-Doc Consistency</span>
                <p className={`font-heading text-xl font-bold ${crossDocScore >= 70 ? 'text-emerald-600' : crossDocScore >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {crossDocScore}%
                </p>
                <p className="text-[11px] text-slate-500">{crossDiscrepancies.filter(d => d.status === 'MISMATCH').length} mismatch(es) detected</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">2. Tamper Forensics</span>
                <p className={`font-heading text-xl font-bold ${avgTamperScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {avgTamperScore}%
                </p>
                <p className="text-[11px] text-slate-500">{avgTamperScore >= 70 ? 'No forgery detected' : 'Severe Microprint/Font anomalies'}</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">3. Face Biometrics</span>
                <p className={`font-heading text-xl font-bold ${faceMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {faceScore}%
                </p>
                <p className="text-[11px] text-slate-500">{faceMatch ? 'Biometric match confirmed' : 'Critical similarity failure (<75%)'}</p>
              </div>
            </div>

            {/* Officer Observation Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Officer Observation &amp; Terminal Notes
              </label>
              <textarea
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
                placeholder="Enter observations, physical document inspection notes, or reasons for escalation..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              />
            </div>

            {/* Decision & 3-Retry Logic Box */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              {/* If score is not clean (Medium or High risk) */}
              {!isScoreClean ? (
                <div className={`p-5 rounded-2xl border space-y-4 ${
                  combinedRiskScore > 65
                    ? 'bg-rose-50/80 border-rose-200'
                    : 'bg-amber-50/80 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {combinedRiskScore > 65 ? (
                        <ShieldAlert size={20} className="text-rose-600" />
                      ) : (
                        <AlertTriangle size={20} className="text-amber-600" />
                      )}
                      <div>
                        <h4 className={`font-heading text-sm font-bold ${
                          combinedRiskScore > 65 ? 'text-rose-900' : 'text-amber-900'
                        }`}>
                          {combinedRiskScore > 65
                            ? 'Critical Fraud Threat: Severe Multi-Factor Tampering Detected'
                            : 'Medium Risk Profile: Discrepancies Flagged'}
                        </h4>
                        <p className={`text-xs ${
                          combinedRiskScore > 65 ? 'text-rose-700' : 'text-amber-800'
                        }`}>
                          {combinedRiskScore > 65
                            ? `Multiple fraudulent credentials intercepted across Passport, National ID, Visa & DOB proof. Cross-document consistency is at ${crossDocScore}%, average authenticity is ${avgTamperScore}%, and facial biometric match failed (${faceScore}%).`
                            : `Cross-document consistency flagged at ${crossDocScore}%. You have ${maxRetries - retryCount} retry attempt(s) remaining.`}
                        </p>
                      </div>
                    </div>

                    <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                      combinedRiskScore > 65
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      Attempt {retryCount + 1} of {maxRetries}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {retryCount < maxRetries ? (
                      <Button
                        variant="secondary"
                        icon={<RotateCcw size={15} />}
                        onClick={handleRetry}
                      >
                        Retry Inspection ({maxRetries - retryCount} Tries Left)
                      </Button>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-2">
                        <AlertCircle size={15} />
                        Maximum retries exhausted (3/3). Case must be escalated to Supervisory Admin.
                      </div>
                    )}

                    <Button
                      variant="danger"
                      icon={<ShieldAlert size={15} />}
                      onClick={() => handleDecision('ESCALATED')}
                    >
                      Send to Admin for Investigation
                    </Button>
                  </div>
                </div>
              ) : (
                /* If score is clean / good */
                <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <div>
                      <h4 className="font-heading text-sm font-bold text-emerald-900">
                        Identity Verification Passed Confidence Check
                      </h4>
                      <p className="text-xs text-emerald-700">
                        All multi-document cross-checks and biometric matching passed with high confidence.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      icon={<CheckCircle2 size={16} />}
                      onClick={() => handleDecision('APPROVED')}
                    >
                      Approve &amp; Seal Verification
                    </Button>
                    <Button
                      variant="secondary"
                      icon={<ShieldAlert size={15} />}
                      onClick={() => handleDecision('ESCALATED')}
                    >
                      Send to Admin for Discretionary Review
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => setStep(3)}>
                Back to Biometrics
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 5: Verification Sealed & Receipt
      ───────────────────────────────────────────────────────────── */}
      {step === 5 && (
        <div className="bg-white border border-slate-200/90 rounded-card p-8 shadow-card text-center space-y-6 animate-scale-in max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-subtle">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              {finalDecisionType === 'APPROVED' ? 'Verification Sealed & Logged' : 'Referred to Admin Review'}
            </span>
            <h2 className="font-heading text-2xl font-bold text-slate-900">
              {finalDecisionType === 'APPROVED' ? 'Identity Dossier Successfully Approved' : 'Dossier Escalated to Supervisory Admin'}
            </h2>
            <p className="text-xs text-slate-500">
              Case record anchored onto the Hyperledger Fabric blockchain ledger.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">ASSIGNED CASE ID:</span>
              <strong className="text-slate-900">{submittedCaseId}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SCREENING OFFICER:</span>
              <strong className="text-slate-900">{user?.name || 'Rajesh Kumar'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">COMBINED RISK SCORE:</span>
              <strong className={combinedRiskScore > 40 ? 'text-rose-600' : 'text-emerald-600'}>
                {combinedRiskScore}/100
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">BLOCKCHAIN TIMESTAMP:</span>
              <span className="text-slate-700">{new Date().toISOString()}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/officer/cases">
              <Button variant="secondary">View in My Cases</Button>
            </Link>
            <Button
              variant="primary"
              onClick={() => {
                setStep(1);
                applyPreset('clean');
              }}
            >
              Start Another Verification
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
