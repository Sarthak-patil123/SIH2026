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
  const [activeScenario, setActiveScenario] = useState<'clean' | 'discrepancy' | 'tampered'>('clean');

  // Documents in intake
  const [docs, setDocs] = useState<VerificationDocument[]>(() => getPresetDocs('clean'));
  const [crossDocScore, setCrossDocScore] = useState<number>(98);
  const [crossDiscrepancies, setCrossDiscrepancies] = useState<CrossDocDiscrepancy[]>(() => getPresetDiscrepancies('clean'));
  const [faceScore, setFaceScore] = useState<number>(97.4);
  const [faceMatch, setFaceMatch] = useState<boolean>(true);

  // Retry counter (Max 3 tries)
  const [retryCount, setRetryCount] = useState<number>(0);
  const maxRetries = 3;

  // Final Decision & Submission state
  const [officerNotes, setOfficerNotes] = useState<string>('');
  const [submittedCaseId, setSubmittedCaseId] = useState<string>('SSB-' + Math.floor(1000 + Math.random() * 9000));
  const [finalDecisionType, setFinalDecisionType] = useState<'APPROVED' | 'ESCALATED'>('APPROVED');

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

    // Tampered scenario
    return [
      {
        id: 'doc-1',
        docType: 'PASSPORT',
        fileName: 'passport_suspicious_forgery.jpg',
        fileSize: '3.4 MB',
        sha256: 'e94f0a3b5c7d9e1f234567890123456789012345bcdef678901bcdef1234567',
        tamperScore: 34.5,
        tamperStatus: 'TAMPERED',
        tamperFindings: [
          { checkName: 'Typography & Font Glyph Integrity', status: 'ANOMALY', confidence: 94.8, details: 'Font mismatch & irregular character spacing detected in serial number region.' },
          { checkName: 'Microprint & Hologram Integrity', status: 'SUSPICIOUS', confidence: 89.2, details: 'Micro-text line distortion around state emblem.' },
          { checkName: 'Photo Cut/Paste Artifact Detection', status: 'SUSPICIOUS', confidence: 86.4, details: 'High-frequency gradient edge discontinuity near portrait perimeter.' },
          { checkName: 'Metadata Modification Inspection', status: 'ANOMALY', confidence: 92.0, details: 'Software modification tag (Adobe Photoshop CC) embedded in header.' },
        ],
        fields: [
          { label: 'Full Legal Name', value: 'VIKRAM MALHOTRA', confidence: 88.5 },
          { label: 'Date of Birth', value: '08/11/1988', confidence: 76.2 },
          { label: 'Nationality', value: 'INDIAN', confidence: 91.0 },
          { label: 'Passport Number', value: 'Z7829103', confidence: 64.1 },
          { label: 'Date of Expiry', value: '18/09/2028', confidence: 71.0 },
        ],
      },
      {
        id: 'doc-2',
        docType: 'VISA_STAMP',
        fileName: 'visa_entry_stamp.jpg',
        fileSize: '1.2 MB',
        sha256: 'f05a1b4c6d8e0f234567890abcdef1234567890123456bcdef789012345678',
        tamperScore: 42.0,
        tamperStatus: 'TAMPERED',
        tamperFindings: [
          { checkName: 'Immigration Stamp Ink & Geometry', status: 'ANOMALY', confidence: 91.5, details: 'Border checkpoint code mismatch with official SSB immigration catalog.' },
          { checkName: 'Overlay Layer Detection', status: 'SUSPICIOUS', confidence: 84.1, details: 'Digital stamp overlay layer detected.' },
        ],
        fields: [
          { label: 'Full Legal Name', value: 'VIKRAM MALHOTRA', confidence: 92.0 },
          { label: 'Visa Type', value: 'TOURIST MULTI-ENTRY', confidence: 89.0 },
          { label: 'Valid Until', value: '30/12/2026', confidence: 85.0 },
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
      { field: 'Full Legal Name', docAValue: 'VIKRAM MALHOTRA', docBValue: 'VIKRAM MALHOTRA', status: 'MATCH', confidence: 91.0, notes: 'Name strings align.' },
      { field: 'Document Serial Number', docAValue: 'Z7829103', docBValue: 'STAMP-REF-9921', status: 'VARIATION', confidence: 72.0, notes: 'Low extraction confidence on serial glyphs.' },
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
      setCrossDocScore(68);
      setFaceScore(41.5);
      setFaceMatch(false);
    }
    setRetryCount(0);
  }

  // Combined Multi-Factor Risk Score Calculation
  const avgTamperScore = Math.round(docs.reduce((sum, d) => sum + d.tamperScore, 0) / (docs.length || 1));
  const combinedVerificationScore = Math.round(
    crossDocScore * 0.35 + avgTamperScore * 0.35 + faceScore * 0.30
  );
  const combinedRiskScore = Math.max(5, 100 - combinedVerificationScore);
  const isScoreClean = combinedRiskScore <= 35 && combinedVerificationScore >= 65;

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
          STEP 1: Document Intake & Pre-populated Scenarios
      ───────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          {/* Preset Quick Select Banner */}
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                  <Zap size={18} className="text-blue-600" />
                  Select Screening Test Scenario
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick a scenario to test cross-document validation, tamper forensics, and retry flows.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PRESETS.map((p) => {
                const isSelected = activeScenario === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-subtle'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                      {isSelected && <Check size={16} className="text-blue-600" />}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">{p.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staged Documents (Only 5 standard types: Passport, Nationality ID, Visa, Driving Licence, DOB Proof) */}
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">
                  Staged Documents for Cross-Verification ({docs.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Supported types: Passport, Nationality ID, Visa, Driving Licence, DOB Proof</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {docs.map((d, idx) => (
                <div key={d.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-heading px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center gap-1.5">
                      <FileCheck2 size={14} className="text-blue-600" />
                      Doc #{idx + 1}: {d.docType.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{d.fileSize}</span>
                  </div>

                  <p className="font-mono text-xs text-slate-700 font-semibold">{d.fileName}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">SHA-256: {d.sha256.slice(0, 32)}...</p>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                variant="primary"
                icon={<ChevronRight size={16} />}
                onClick={() => setStep(2)}
              >
                Proceed to Multi-Doc Forensics
              </Button>
            </div>
          </div>
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
              <p className="text-xs text-slate-400 mt-0.5">High-accuracy OCR bio-data without raw text blocks</p>
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
                          <span className="text-[10px] text-emerald-600 font-bold">({f.confidence}%)</span>
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
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-6">
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera size={18} className="text-purple-600" />
                Step 3: 1:1 Live Biometric Facial Match &amp; Liveness
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ArcFace multi-angle facial recognition against primary document bio-page
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
              {/* Photo Comparison Box */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
                <div className="flex items-center justify-center gap-6">
                  <div className="space-y-1.5">
                    <div className="w-24 h-28 bg-blue-100 rounded-xl border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                      <User size={36} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Document Photo</span>
                  </div>

                  <div className="space-y-1 text-slate-400">
                    <span className="text-xs font-bold block">1:1 MATCH</span>
                    <ArrowRight size={20} className="mx-auto text-blue-600" />
                  </div>

                  <div className="space-y-1.5">
                    <div className={`w-24 h-28 rounded-xl border flex items-center justify-center font-bold ${
                      faceMatch ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-rose-100 border-rose-200 text-rose-700'
                    }`}>
                      <User size={36} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Live Camera Feed</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    faceMatch
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {faceMatch ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {faceMatch ? 'LIVENESS CONFIRMED (98.4%)' : 'LIVENESS SUSPICIOUS'}
                  </span>
                </div>
              </div>

              {/* Facial Match Results */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Facial Similarity Score</span>
                    <span className={`font-heading text-2xl font-bold ${faceMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {faceScore}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${faceMatch ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${faceScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">Inter-pupillary Distance &amp; Landmarks</span>
                    <strong className="text-emerald-700">98.9% Aligned</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">3D Depth &amp; Liveness Vector</span>
                    <strong className="text-emerald-700">Passed</strong>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">Anti-Spoofing Silicon Mask Test</span>
                    <strong className="text-emerald-700">Clean</strong>
                  </div>
                </div>
              </div>
            </div>

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
                  <span className={`font-heading text-2xl font-bold ${combinedRiskScore > 40 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {combinedRiskScore}/100 ({combinedRiskScore > 40 ? 'High Risk' : 'Low Risk'})
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  combinedRiskScore > 40 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {combinedRiskScore > 40 ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                </div>
              </div>
            </div>

            {/* Evidence Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">1. Cross-Doc Consistency</span>
                <p className={`font-heading text-xl font-bold ${crossDocScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {crossDocScore}%
                </p>
                <p className="text-[11px] text-slate-500">{crossDiscrepancies.filter(d => d.status === 'MISMATCH').length} mismatch(es) detected</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">2. Tamper Forensics</span>
                <p className={`font-heading text-xl font-bold ${avgTamperScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {avgTamperScore}%
                </p>
                <p className="text-[11px] text-slate-500">{avgTamperScore >= 70 ? 'No forgery detected' : 'Microprint/Font anomalies'}</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">3. Face Biometrics</span>
                <p className={`font-heading text-xl font-bold ${faceMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {faceScore}%
                </p>
                <p className="text-[11px] text-slate-500">{faceMatch ? 'Biometric match confirmed' : 'Similarity below threshold'}</p>
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
              {/* If score is not clean (Risk > 40 or verification failed) */}
              {!isScoreClean ? (
                <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert size={20} className="text-rose-600" />
                      <div>
                        <h4 className="font-heading text-sm font-bold text-rose-900">
                          High Risk Screening Profile Detected
                        </h4>
                        <p className="text-xs text-rose-700">
                          Verification failed confidence thresholds. You have {maxRetries - retryCount} retry attempt(s) remaining.
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
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
