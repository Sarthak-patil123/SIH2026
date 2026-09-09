'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload, Camera, FileText, CheckCircle2, AlertTriangle, ChevronRight,
  ChevronLeft, RotateCcw, Hash, Shield, User, Eye, Loader2,
  Check, X, ScanLine, ArrowLeft, AlertCircle, ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases } from '@/lib/mock-data';
import { cn, formatFileSize, truncateHash } from '@/lib/utils';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfidenceBar from '@/components/ui/ConfidenceBar';

type Step = 1 | 2 | 3 | 4 | 5;
type DocType = 'PASSPORT' | 'NATIONAL_ID' | 'VISA_STAMP' | 'DRIVING_LICENSE' | 'DOB_PROOF';

interface OCRField {
  label: string;
  value: string;
  confidence: number;
  manuallyModified?: boolean;
  editValue?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  sha256: string;
  type: DocType;
  preview?: string;
}

const STEPS = [
  { num: 1, label: 'Document' },
  { num: 2, label: 'OCR Analysis' },
  { num: 3, label: 'Face Match' },
  { num: 4, label: 'Review' },
  { num: 5, label: 'Submitted' },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto py-2">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                current === step.num
                  ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-50'
                  : current > step.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              )}
            >
              {current > step.num ? <Check size={14} /> : step.num}
            </div>
            <span
              className={cn(
                'text-[11px] font-medium mt-1.5 hidden sm:block whitespace-nowrap',
                current === step.num ? 'text-blue-600 font-semibold' : current > step.num ? 'text-slate-700' : 'text-slate-400'
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={cn(
                'flex-1 h-[2px] mx-2 transition-colors duration-200',
                current > step.num ? 'bg-emerald-500' : 'bg-slate-200'
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const MOCK_OCR_FIELDS: OCRField[] = [
  { label: 'Full Name', value: 'RAJESH KUMAR', confidence: 98.4 },
  { label: 'Date of Birth', value: '12 MAY 1998', confidence: 96.2 },
  { label: 'Nationality', value: 'INDIAN', confidence: 99.1 },
  { label: 'Gender', value: 'MALE', confidence: 99.8 },
  { label: 'Passport Number', value: 'N1234567', confidence: 97.5 },
  { label: 'Date of Issue', value: '15 JAN 2020', confidence: 95.3 },
  { label: 'Date of Expiry', value: '14 JAN 2030', confidence: 94.8 },
  { label: 'Place of Issue', value: 'NEW DELHI', confidence: 93.2 },
];

export default function OfficerVerifyPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [docType, setDocType] = useState<DocType>('PASSPORT');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — OCR
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrFields, setOcrFields] = useState<OCRField[]>(MOCK_OCR_FIELDS.map((f) => ({ ...f, editValue: f.value })));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Step 3 — Face
  const [faceStep, setFaceStep] = useState<'idle' | 'loading' | 'done'>('idle');
  const [faceResult] = useState({ similarity: 94.8, liveness: 98.1, status: 'MATCH' as const });

  // Step 4 — Decision
  const [decision, setDecision] = useState<'pass' | 'flag' | null>(null);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagObservations, setFlagObservations] = useState('');
  const [submittedCaseId, setSubmittedCaseId] = useState('');

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function processFile(file: File) {
    setUploadedFile({
      name: file.name,
      size: file.size,
      sha256: 'a82f9c3d1e74b2f8912c45d6e789' + Math.random().toString(16).slice(2, 10),
      type: docType,
    });
  }

  async function runOCR() {
    setOcrLoading(true);
    setStep(2);
    await new Promise((r) => setTimeout(r, 1400));
    setOcrLoading(false);
    setOcrDone(true);
  }

  async function runFace() {
    setFaceStep('loading');
    await new Promise((r) => setTimeout(r, 1800));
    setFaceStep('done');
  }

  function saveEdit(idx: number) {
    setOcrFields((fields) =>
      fields.map((f, i) =>
        i === idx
          ? { ...f, value: f.editValue ?? f.value, manuallyModified: f.editValue !== MOCK_OCR_FIELDS[i].value }
          : f
      )
    );
    setEditingIdx(null);
  }

  function handleSubmit(finalDecision: 'pass' | 'flag') {
    const caseNumber = `SSB-10${30 + Math.floor(Math.random() * 10)}`;
    const caseId = `case-new-${Date.now()}`;
    const newCase = {
      id: caseId,
      caseNumber,
      title: `${docType.replace(/_/g, ' ')} Verification — ${ocrFields.find((f) => f.label === 'Full Name')?.value ?? 'Unknown'}`,
      status: (finalDecision === 'flag' ? 'FLAGGED' : 'PENDING') as any,
      riskScore: finalDecision === 'flag' ? 72 : 18,
      riskLevel: (finalDecision === 'flag' ? 'HIGH' : 'LOW') as any,
      officerId: user?.id ?? '',
      officerName: user?.name ?? '',
      applicantName: ocrFields.find((f) => f.label === 'Full Name')?.value ?? 'Rajesh Kumar',
      applicantDob: ocrFields.find((f) => f.label === 'Date of Birth')?.value ?? '12/05/1998',
      documents: [
        {
          id: `doc-${Date.now()}`,
          caseId,
          fileName: uploadedFile?.name ?? 'document.pdf',
          fileUrl: uploadedFile?.preview ?? '/samples/passport-sample.png',
          fileSize: uploadedFile?.size ?? 1024000,
          mimeType: 'image/jpeg',
          storagePath: '/uploads/doc.jpg',
          sha256Hash: uploadedFile?.sha256 ?? 'a82f9c3d1e74b2f8912c45d6e7890123',
          docType,
          status: 'PROCESSED' as any,
          ocrConfidence: 97.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      flagReason: finalDecision === 'flag' ? flagReason : undefined,
      officerObservations: finalDecision === 'flag' ? flagObservations : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCases.unshift(newCase);
    setSubmittedCaseId(caseId);
    setDecision(finalDecision);
    setStep(5);
  }

  // ── Step Renderers ───────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900">Step 1: Upload Identity Document</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select document category and submit image or scan for digital processing</p>
        </div>

        {/* Document Type Selector */}
        <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Document Classification</p>
          <div className="flex flex-wrap gap-2.5">
            {([
              ['PASSPORT', 'Passport'],
              ['NATIONAL_ID', 'National ID / Aadhaar'],
              ['VISA_STAMP', 'Entry Visa Stamp'],
              ['DRIVING_LICENSE', 'Driving License'],
              ['DOB_PROOF', 'Birth Proof'],
            ] as [DocType, string][]).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setDocType(val)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150',
                  docType === val
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-subtle'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {!uploadedFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            className={cn(
              'border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 text-center transition-all duration-150',
              dragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 bg-white shadow-card'
            )}
          >
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
              <Upload size={24} />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-slate-900">Upload Identity Document</p>
              <p className="text-xs text-slate-400 mt-1">Drag and drop document files, or choose from your computer</p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                icon={<FileText size={15} />}
              >
                Select File
              </Button>
              <Button
                variant="secondary"
                onClick={() => processFile(new File(['mock'], 'sample_passport.jpg', { type: 'image/jpeg' }))}
                icon={<Camera size={15} />}
              >
                Use Camera Capture
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">Supported formats: JPG, PNG, PDF · Maximum size: 15MB</p>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
          </div>
        ) : (
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold font-heading text-slate-900">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-500">{docType.replace(/_/g, ' ')} · {formatFileSize(uploadedFile.size)}</p>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mt-1">
                    <Hash size={12} />
                    <span>{truncateHash(uploadedFile.sha256, 10)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setUploadedFile(null)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Document Preview Box */}
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200/80 flex flex-col items-center justify-center text-center">
              <FileText size={36} className="text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">{uploadedFile.name}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-2">
                <CheckCircle2 size={13} /> SHA-256 Hash Generated · Ready for OCR
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={runOCR} icon={<ScanLine size={15} />}>
                Execute OCR Analysis
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900">Step 2: Optical Character Recognition</h2>
          <p className="text-xs text-slate-500 mt-0.5">Automated text parsing and document security features inspection</p>
        </div>

        {ocrLoading ? (
          <div className="bg-white border border-slate-200/90 rounded-card p-16 shadow-card flex flex-col items-center gap-4 text-center">
            <Loader2 size={36} className="text-blue-600 animate-spin" />
            <div>
              <p className="font-heading text-base font-bold text-slate-900">Parsing Identity Fields...</p>
              <p className="text-xs text-slate-400 mt-1">Running deep learning OCR and MRZ verification models</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Preview */}
            <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wide">Document Scan</h4>
                <span className="text-[11px] font-mono text-slate-400">{uploadedFile?.name}</span>
              </div>
              <div className="bg-slate-900 rounded-xl h-64 flex flex-col items-center justify-center text-white border border-slate-800">
                <FileText size={40} className="text-blue-400 mb-2" />
                <p className="text-xs font-semibold text-slate-200">{uploadedFile?.name ?? 'Document Scan'}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1">
                  SHA: {truncateHash(uploadedFile?.sha256 ?? 'a82f9c3d1e', 6)}
                </span>
              </div>
            </div>

            {/* Extracted Fields */}
            <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wide">Extracted Data</h4>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {(ocrFields.reduce((s, f) => s + f.confidence, 0) / ocrFields.length).toFixed(1)}% Avg Confidence
                </span>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {ocrFields.map((field, idx) => (
                  <div key={field.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{field.label}</span>
                      <button
                        type="button"
                        onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        {editingIdx === idx ? 'Cancel' : 'Edit'}
                      </button>
                    </div>

                    {editingIdx === idx ? (
                      <div className="flex gap-2 pt-1">
                        <input
                          className="flex-1 bg-white border border-blue-500 text-slate-900 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                          value={field.editValue}
                          onChange={(e) =>
                            setOcrFields((f) => f.map((x, i) => (i === idx ? { ...x, editValue: e.target.value } : x)))
                          }
                        />
                        <Button size="xs" variant="primary" onClick={() => saveEdit(idx)}>Save</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 font-mono">
                          {field.value}
                          {field.manuallyModified && (
                            <span className="ml-2 text-[10px] text-amber-600 font-sans font-normal">(modified)</span>
                          )}
                        </p>
                        <ConfidenceBar value={field.confidence} segmentsCount={8} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button variant="primary" onClick={() => setStep(3)}>
                  Proceed to Face Match <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900">Step 3: Biometric Face Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">Compare live facial capture with document photograph</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document Photo */}
          <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
            <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              Document Photo
            </h4>
            <div className="bg-slate-50 rounded-xl h-48 flex flex-col items-center justify-center text-slate-400 border border-slate-100">
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center mb-2">
                <User size={32} className="text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-slate-700">Archived ID Photo</p>
            </div>
          </div>

          {/* Live Capture */}
          <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
            <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              Live Camera Capture
            </h4>
            <div className="bg-slate-50 rounded-xl h-48 flex flex-col items-center justify-center text-slate-400 border border-slate-100">
              {faceStep === 'idle' ? (
                <div className="flex flex-col items-center gap-2">
                  <Camera size={32} className="text-slate-400" />
                  <p className="text-xs text-slate-500">Camera ready</p>
                </div>
              ) : faceStep === 'loading' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={32} className="text-blue-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-700">Scanning live liveness...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center">
                    <User size={32} className="text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Face Captured
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              {faceStep === 'idle' ? (
                <Button fullWidth variant="primary" onClick={runFace} icon={<Camera size={15} />}>
                  Run Biometric Match
                </Button>
              ) : faceStep === 'loading' ? (
                <Button fullWidth variant="secondary" loading>Comparing features...</Button>
              ) : (
                <Button fullWidth variant="secondary" onClick={() => setFaceStep('idle')} icon={<RotateCcw size={15} />}>
                  Retake Picture
                </Button>
              )}
            </div>
          </div>
        </div>

        {faceStep === 'done' && (
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-5 animate-fade-in">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400">Similarity</span>
                <p className="font-heading text-xl font-bold text-emerald-600 mt-0.5">{faceResult.similarity}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400">Liveness</span>
                <p className="font-heading text-xl font-bold text-emerald-600 mt-0.5">{faceResult.liveness}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-slate-400">Result</span>
                <p className="font-heading text-xl font-bold text-emerald-600 mt-0.5">MATCH</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setStep(4)}>
                Review Findings <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900">Step 4: Officer Review &amp; Decision</h2>
          <p className="text-xs text-slate-500 mt-0.5">Validate AI screening observations before saving the official record</p>
        </div>

        {/* Screening Decision Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div
            onClick={() => handleSubmit('pass')}
            className="p-6 bg-white border border-slate-200/90 hover:border-emerald-500 rounded-card shadow-card cursor-pointer transition-all hover:shadow-card-hover group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <CheckCircle2 size={20} />
            </div>
            <h4 className="font-heading text-base font-bold text-slate-900 group-hover:text-emerald-700">
              Pass Initial Screening
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              All credentials match verified thresholds. Record passes to standard pipeline.
            </p>
          </div>

          <div
            onClick={() => setFlagDialogOpen(true)}
            className="p-6 bg-white border border-slate-200/90 hover:border-rose-500 rounded-card shadow-card cursor-pointer transition-all hover:shadow-card-hover group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ShieldAlert size={20} />
            </div>
            <h4 className="font-heading text-base font-bold text-slate-900 group-hover:text-rose-700">
              Flag for Admin Review
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Escalate to security supervisor due to potential tampering or biometric discrepancy.
            </p>
          </div>
        </div>

        {/* Flag Modal Dialog */}
        {flagDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFlagDialogOpen(false)} />
            <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-modal p-6 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-heading text-base font-bold text-slate-900">Escalate Case to Admin</h3>
                <button onClick={() => setFlagDialogOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Trigger Reason</label>
                  <div className="space-y-2">
                    {['Face mismatch', 'OCR inconsistency', 'Document alteration', 'Suspicious identity', 'Other'].map((r) => (
                      <label key={r} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="flagReason"
                          value={r}
                          checked={flagReason === r}
                          onChange={(e) => setFlagReason(e.target.value)}
                          className="accent-blue-600"
                        />
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">Officer Observation Notes</label>
                  <textarea
                    value={flagObservations}
                    onChange={(e) => setFlagObservations(e.target.value)}
                    placeholder="Provide specific notes for the investigating admin..."
                    rows={3}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setFlagDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  disabled={!flagReason}
                  onClick={() => { setFlagDialogOpen(false); handleSubmit('flag'); }}
                >
                  Confirm Escalation
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep5() {
    const isPass = decision === 'pass';
    return (
      <div className="bg-white border border-slate-200/90 rounded-card p-10 shadow-card text-center space-y-6 max-w-xl mx-auto">
        <div className={cn('w-16 h-16 rounded-2xl mx-auto flex items-center justify-center', isPass ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
          {isPass ? <CheckCircle2 size={32} /> : <ShieldAlert size={32} />}
        </div>

        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-bold text-slate-900">
            {isPass ? 'Verification Record Created' : 'Case Flagged for Admin Oversight'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isPass
              ? 'The applicant document passed initial screening and has been registered.'
              : 'The case has been escalated to the security review division.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4">
          {submittedCaseId && (
            <Link href={`/officer/cases/${submittedCaseId}`}>
              <Button variant="secondary">Inspect Case</Button>
            </Link>
          )}
          <Link href="/officer/cases">
            <Button variant="primary">Return to My Cases</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          New Document Verification
        </h1>
        <p className="text-sm text-slate-500 mt-1">Multi-stage document screening and identity extraction terminal</p>
      </div>

      {/* Stepper Card */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
        <StepIndicator current={step} />
      </div>

      {/* Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}

      {step > 1 && step < 5 && (
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={15} /> Previous Step
        </button>
      )}
    </div>
  );
}
