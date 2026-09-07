'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Upload, Camera, FileText, CheckCircle, AlertTriangle, ChevronRight,
  ChevronLeft, RotateCcw, ZoomIn, Hash, Shield, User, Eye, Loader2,
  Check, X, ScanLine,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases, updateMockCase } from '@/lib/mock-data';
import { cn, formatFileSize, getConfidenceClasses, getConfidenceBgClasses, truncateHash } from '@/lib/utils';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui/Input';

// ── Types ──────────────────────────────────────────────────────

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
}

// ── Step Indicator ─────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Document' },
  { num: 2, label: 'OCR' },
  { num: 3, label: 'Face Verification' },
  { num: 4, label: 'Review' },
  { num: 5, label: 'Submit' },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
              current === step.num
                ? 'bg-blue-600 border-blue-600 text-white shadow-glow-blue'
                : current > step.num
                ? 'bg-success border-success text-white'
                : 'bg-navy-700 border-navy-500 text-slate-400'
            )}>
              {current > step.num ? <Check size={14} /> : step.num}
            </div>
            <span className={cn(
              'text-[10px] font-medium mt-1.5 hidden sm:block whitespace-nowrap',
              current === step.num ? 'text-blue-400' : current > step.num ? 'text-success' : 'text-slate-500'
            )}>
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={cn('flex-1 h-0.5 mx-1 transition-colors', current > step.num ? 'bg-success' : 'bg-navy-600')} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Mock OCR Data ──────────────────────────────────────────────

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

// ── Main Page ──────────────────────────────────────────────────

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
  const [submitted, setSubmitted] = useState(false);
  const [submittedCaseId, setSubmittedCaseId] = useState('');

  // ── Handlers ────────────────────────────────────────────────

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
    await new Promise((r) => setTimeout(r, 2000));
    setOcrLoading(false);
    setOcrDone(true);
  }

  async function runFace() {
    setFaceStep('loading');
    await new Promise((r) => setTimeout(r, 2500));
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
    // Create a new case in mock data
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
      documents: [],
      flagReason: finalDecision === 'flag' ? flagReason : undefined,
      officerObservations: finalDecision === 'flag' ? flagObservations : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCases.unshift(newCase);
    setSubmittedCaseId(caseId);
    setDecision(finalDecision);
    setSubmitted(true);
    setStep(5);
  }

  // ── Step Renderers ───────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Document Verification</h2>
            <p className="text-sm text-slate-400 mt-0.5">Upload an identity document to begin verification</p>
          </div>
        </div>

        {/* Document type selector */}
        <Card>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Select Document Type</p>
          <div className="flex flex-wrap gap-2">
            {([
              ['PASSPORT', 'Passport'],
              ['NATIONAL_ID', 'National ID'],
              ['VISA_STAMP', 'Visa Stamp'],
              ['DRIVING_LICENSE', 'Driving License'],
              ['DOB_PROOF', 'DOB Proof'],
            ] as [DocType, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDocType(val)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                  docType === val
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-navy-700 border-navy-600 text-slate-400 hover:border-navy-500 hover:text-slate-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Upload area */}
        {!uploadedFile ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 text-center transition-all duration-150',
              dragging ? 'border-blue-500 bg-blue-500/10' : 'border-navy-500 hover:border-navy-400 bg-navy-800'
            )}
          >
            <div className="w-16 h-16 bg-navy-700 rounded-2xl flex items-center justify-center">
              <Upload size={28} className="text-slate-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-300">Upload Document</p>
              <p className="text-sm text-slate-500 mt-1">Drag & drop your document here, or</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <FileText size={15} /> Choose File
              </button>
              <button
                onClick={() => processFile(new File(['mock'], 'passport_sample.jpg', { type: 'image/jpeg' }))}
                className="flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-slate-300 text-sm font-medium rounded-lg border border-navy-500 transition-colors"
              >
                <Camera size={15} /> Use Camera
              </button>
            </div>
            <p className="text-xs text-slate-600">Supported: JPG, PNG, PDF · Max 10MB</p>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
          </div>
        ) : (
          <Card>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={22} className="text-blue-400" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-bold text-slate-100">{uploadedFile.name}</p>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span>Type: <span className="text-slate-200">{docType}</span></span>
                  <span>Size: <span className="text-slate-200">{formatFileSize(uploadedFile.size)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <Hash size={11} />
                  <span className="font-mono">{truncateHash(uploadedFile.sha256)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-success mt-1">
                  <CheckCircle size={12} /> Upload successful
                </div>
              </div>
              <button onClick={() => setUploadedFile(null)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {/* Mock document preview */}
            <div className="mt-4 bg-navy-900/50 rounded-lg h-40 flex items-center justify-center border border-navy-600">
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <FileText size={36} />
                <p className="text-xs">Document Preview</p>
                <p className="text-[10px] font-mono text-slate-700">{uploadedFile.name}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-navy-600 flex justify-end">
              <Button onClick={runOCR} icon={<ScanLine size={15} />}>Run OCR</Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-100">OCR Extraction</h2>
          <p className="text-sm text-slate-400 mt-0.5">Extracting identity information from document</p>
        </div>

        {ocrLoading ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <Loader2 size={40} className="text-blue-400 animate-spin" />
            <div className="text-center">
              <p className="text-base font-semibold text-slate-200">Extracting identity information...</p>
              <p className="text-sm text-slate-400 mt-1">This may take a moment</p>
            </div>
            <div className="space-y-1 text-xs text-slate-500 text-center">
              <p>✓ Document format validated</p>
              <p>✓ Image quality verified</p>
              <p className="text-blue-400 animate-pulse">⟳ Running OCR engine...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Document preview */}
            <Card>
              <CardHeader><CardTitle>Document Preview</CardTitle></CardHeader>
              <div className="bg-navy-900/50 rounded-lg h-64 flex items-center justify-center border border-navy-600">
                <div className="flex flex-col items-center gap-2 text-slate-600">
                  <FileText size={48} />
                  <p className="text-sm">{uploadedFile?.name ?? 'Document'}</p>
                </div>
              </div>
              <div className="mt-3 p-2 bg-navy-700/50 rounded flex items-center gap-2 text-xs text-slate-500">
                <Hash size={11} />
                <span className="font-mono">{truncateHash(uploadedFile?.sha256 ?? 'a82f...91bc')}</span>
              </div>
            </Card>

            {/* OCR Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Extracted Information</CardTitle>
                <span className="text-xs font-semibold text-success">
                  {(ocrFields.reduce((s, f) => s + f.confidence, 0) / ocrFields.length).toFixed(1)}% avg
                </span>
              </CardHeader>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {ocrFields.map((field, idx) => (
                  <div key={field.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">{field.label}</p>
                      <button
                        onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                        className="text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        {editingIdx === idx ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    {editingIdx === idx ? (
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-navy-700 border border-blue-500 text-slate-100 rounded px-2 py-1 text-xs"
                          value={field.editValue}
                          onChange={(e) => setOcrFields((f) => f.map((x, i) => i === idx ? { ...x, editValue: e.target.value } : x))}
                        />
                        <button onClick={() => saveEdit(idx)} className="text-success hover:text-emerald-400">
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-100">
                          {field.value}
                          {field.manuallyModified && (
                            <span className="ml-2 text-[10px] text-warning font-normal">manually modified</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-navy-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getConfidenceBgClasses(field.confidence)}`}
                              style={{ width: `${field.confidence}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-medium ${getConfidenceClasses(field.confidence)}`}>
                            {field.confidence.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="h-px bg-navy-600/50" />
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {ocrFields.some((f) => f.confidence < 70) && (
                <div className="mt-3 flex items-start gap-2 p-2.5 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  Some fields have low confidence. Please verify manually.
                </div>
              )}
            </Card>
          </div>
        )}

        {ocrDone && (
          <div className="flex justify-end">
            <Button onClick={() => setStep(3)}>Continue <ChevronRight size={15} /></Button>
          </div>
        )}
      </div>
    );
  }

  function renderStep3() {
    const faceStatusConfig = {
      MATCH: { color: 'text-success', bg: 'bg-success/10 border-success/30', label: '✓ MATCH' },
      REVIEW: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', label: '⚠ REVIEW' },
      NO_MATCH: { color: 'text-danger', bg: 'bg-danger/10 border-danger/30', label: '✕ NO MATCH' },
    };
    const config = faceStatusConfig[faceResult.status];

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Face Verification</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Compare the photograph on the identity document with a live face capture
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Document Face */}
          <Card>
            <CardHeader><CardTitle>Document Face</CardTitle></CardHeader>
            <div className="bg-navy-900/50 rounded-lg h-48 flex items-center justify-center border border-navy-600">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-24 h-24 rounded-full bg-navy-700 border-2 border-navy-500 flex items-center justify-center">
                  <User size={36} className="text-slate-500" />
                </div>
                <p className="text-xs">Document Photo</p>
              </div>
            </div>
          </Card>

          {/* Live Capture */}
          <Card>
            <CardHeader><CardTitle>Live Capture</CardTitle></CardHeader>
            <div className="bg-navy-900/50 rounded-lg h-48 flex items-center justify-center border border-navy-600 relative overflow-hidden">
              {faceStep === 'idle' ? (
                <div className="flex flex-col items-center gap-3">
                  <Camera size={36} className="text-slate-600" />
                  <Button size="sm" variant="secondary" onClick={() => {}} icon={<Camera size={14} />}>Start Camera</Button>
                </div>
              ) : faceStep === 'loading' ? (
                <div className="flex flex-col items-center gap-4 text-center px-4">
                  <div className="w-20 h-20 rounded-full bg-navy-700 border-2 border-blue-500/50 flex items-center justify-center relative">
                    <User size={28} className="text-slate-400" />
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p className="text-blue-400 animate-pulse">⟳ Detecting face...</p>
                    <p className="text-success">✓ Liveness check</p>
                    <p className="text-success">✓ Face captured</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full bg-navy-600 border-2 border-success/50 flex items-center justify-center">
                    <User size={36} className="text-slate-400" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle size={13} /> Face captured
                  </div>
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              {faceStep === 'idle' && (
                <Button size="sm" variant="secondary" fullWidth icon={<Camera size={14} />} onClick={runFace}>
                  Capture Face
                </Button>
              )}
              {faceStep === 'loading' && (
                <Button size="sm" variant="secondary" fullWidth loading>Processing...</Button>
              )}
              {faceStep === 'done' && (
                <Button size="sm" variant="secondary" fullWidth icon={<RotateCcw size={14} />} onClick={() => setFaceStep('idle')}>
                  Retake
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Run Verification Button */}
        {faceStep !== 'done' && faceStep !== 'loading' && (
          <Button fullWidth onClick={runFace} icon={<ScanLine size={15} />} variant="primary">
            Run Verification
          </Button>
        )}

        {/* Result */}
        {faceStep === 'done' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Verification Results</CardTitle></CardHeader>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Face Similarity', value: `${faceResult.similarity}%`, score: faceResult.similarity },
                  { label: 'Liveness Score', value: `${faceResult.liveness}%`, score: faceResult.liveness },
                  { label: 'Result', value: faceResult.status, isStatus: true },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
                    {item.isStatus ? (
                      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    ) : (
                      <p className={`text-2xl font-bold ${getConfidenceClasses(item.score!)}`}>{item.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Match banner */}
              <div className={cn('p-4 rounded-lg border text-center', config.bg)}>
                <p className={cn('text-xl font-bold', config.color)}>{config.label}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {faceResult.status === 'MATCH' ? 'Face successfully verified against document.' :
                   faceResult.status === 'REVIEW' ? 'Similarity is borderline. Manual review recommended.' :
                   'Face does not match document. Flag for admin review.'}
                </p>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => setStep(4)}>Continue <ChevronRight size={15} /></Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    const overallOCRConf = (ocrFields.reduce((s, f) => s + f.confidence, 0) / ocrFields.length).toFixed(1);
    const riskScore = faceResult.status === 'MATCH' ? 18 : faceResult.status === 'REVIEW' ? 54 : 78;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Verification Review</h2>
          <p className="text-sm text-slate-400 mt-0.5">Review all verification results before submitting</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Verification Summary</CardTitle></CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Document Type', value: docType.replace(/_/g, ' ') },
              { label: 'OCR Status', value: 'COMPLETED', color: 'text-success' },
              { label: 'OCR Confidence', value: `${overallOCRConf}%`, color: parseFloat(overallOCRConf) >= 85 ? 'text-success' : 'text-warning' },
              { label: 'Face Match', value: faceResult.status, color: faceResult.status === 'MATCH' ? 'text-success' : faceResult.status === 'REVIEW' ? 'text-warning' : 'text-danger' },
              { label: 'Face Similarity', value: `${faceResult.similarity}%`, color: getConfidenceClasses(faceResult.similarity) },
              { label: 'Liveness', value: `${faceResult.liveness}%`, color: getConfidenceClasses(faceResult.liveness) },
              { label: 'Risk Score', value: riskScore.toString(), color: riskScore <= 30 ? 'text-success' : riskScore <= 60 ? 'text-warning' : 'text-danger' },
              { label: 'Risk Level', value: riskScore <= 30 ? 'LOW' : riskScore <= 60 ? 'MEDIUM' : 'HIGH', color: riskScore <= 30 ? 'text-success' : riskScore <= 60 ? 'text-warning' : 'text-danger' },
              { label: 'Officer', value: user?.name ?? 'Unknown' },
            ].map((item) => (
              <div key={item.label} className="bg-navy-700/50 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
                <p className={cn('text-sm font-bold', item.color ?? 'text-slate-200')}>{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">Initial Screening Decision</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleSubmit('pass')}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-success/40 bg-success/5 hover:bg-success/10 hover:border-success transition-all group"
            >
              <CheckCircle size={36} className="text-success" />
              <div className="text-center">
                <p className="text-base font-bold text-success">Pass Initial Screening</p>
                <p className="text-xs text-slate-400 mt-1">Case passes officer-level verification</p>
              </div>
            </button>
            <button
              onClick={() => setFlagDialogOpen(true)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-danger/40 bg-danger/5 hover:bg-danger/10 hover:border-danger transition-all group"
            >
              <AlertTriangle size={36} className="text-danger" />
              <div className="text-center">
                <p className="text-base font-bold text-danger">Flag for Admin Review</p>
                <p className="text-xs text-slate-400 mt-1">Refer suspicious case to admin</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Flag Dialog */}
        {flagDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setFlagDialogOpen(false)} />
            <div className="relative w-full max-w-md bg-navy-800 border border-navy-500 rounded-xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100">Flag for Admin Review</h3>
                <button onClick={() => setFlagDialogOpen(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">Flag Reason</label>
                  <div className="space-y-1.5">
                    {['Face mismatch', 'OCR inconsistency', 'Document issue', 'Suspicious identity', 'Other'].map((r) => (
                      <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="flagReason"
                          value={r}
                          checked={flagReason === r}
                          onChange={(e) => setFlagReason(e.target.value)}
                          className="accent-blue-500"
                        />
                        <span className="text-sm text-slate-300">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">Officer Observations</label>
                  <textarea
                    value={flagObservations}
                    onChange={(e) => setFlagObservations(e.target.value)}
                    placeholder="Describe the reason for flagging..."
                    rows={3}
                    className="w-full bg-navy-700 border border-navy-600 text-slate-100 rounded-md px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setFlagDialogOpen(false)} className="flex-1 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg text-sm font-medium border border-navy-500 transition-colors">
                  Cancel
                </button>
                <button
                  disabled={!flagReason}
                  onClick={() => { setFlagDialogOpen(false); handleSubmit('flag'); }}
                  className="flex-1 px-4 py-2 bg-danger hover:bg-red-500 disabled:bg-danger/40 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  Submit to Admin
                </button>
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
      <div className="space-y-5">
        <div className={cn(
          'rounded-2xl p-8 flex flex-col items-center gap-4 text-center border',
          isPass ? 'bg-success/5 border-success/30' : 'bg-warning/5 border-warning/30'
        )}>
          <div className={cn('w-20 h-20 rounded-full flex items-center justify-center', isPass ? 'bg-success/20' : 'bg-warning/20')}>
            {isPass ? <CheckCircle size={40} className="text-success" /> : <AlertTriangle size={40} className="text-warning" />}
          </div>
          <div>
            <h2 className={cn('text-xl font-bold', isPass ? 'text-success' : 'text-warning')}>
              {isPass ? '✓ Initial Screening Passed' : '⚠ Case Referred to Admin'}
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-md">
              {isPass
                ? 'Case has successfully passed the Officer\'s initial screening and is now pending system review.'
                : 'Anomaly detected. The case has been submitted for manual verification by the Admin.'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Case Details</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Officer</p>
              <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
              <p className={cn('text-sm font-bold', isPass ? 'text-success' : 'text-warning')}>
                {isPass ? 'PENDING' : 'FLAGGED'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Risk Level</p>
              <p className={cn('text-sm font-bold', isPass ? 'text-success' : 'text-danger')}>
                {isPass ? 'LOW' : 'HIGH'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Document Type</p>
              <p className="text-sm font-semibold text-slate-200">{docType.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          {submittedCaseId && (
            <Link href={`/officer/cases/${submittedCaseId}`} className="flex-1">
              <Button fullWidth variant="secondary">View Case</Button>
            </Link>
          )}
          <Link href="/officer/cases" className="flex-1">
            <Button fullWidth>Back to My Cases</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">New Verification</h1>
        <p className="text-sm text-slate-400 mt-0.5">Identity document screening workflow</p>
      </div>

      {/* Stepper */}
      <Card>
        <StepIndicator current={step} />
      </Card>

      {/* Step Content */}
      <div>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* Navigation (steps 2-4) */}
      {step > 1 && step < 5 && (
        <div className="flex justify-start">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={15} /> Previous Step
          </button>
        </div>
      )}
    </div>
  );
}
