import { PrismaClient, Role, CaseStatus, RiskLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  // ── Officers ────────────────────────────────────────────────────────────────
  const officer1 = await prisma.user.upsert({
    where: { email: 'officer@ssb.gov.in' },
    update: { passwordHash },
    create: {
      email: 'officer@ssb.gov.in',
      name: 'Rajesh Kumar',
      role: Role.OFFICER,
      passwordHash,
    },
  });

  const officer2 = await prisma.user.upsert({
    where: { email: 'priya.singh@ssb.gov.in' },
    update: { passwordHash },
    create: {
      email: 'priya.singh@ssb.gov.in',
      name: 'Priya Singh',
      role: Role.OFFICER,
      passwordHash,
    },
  });

  const officer3 = await prisma.user.upsert({
    where: { email: 'dev.mehta@ssb.gov.in' },
    update: { passwordHash },
    create: {
      email: 'dev.mehta@ssb.gov.in',
      name: 'Dev Mehta',
      role: Role.OFFICER,
      passwordHash,
    },
  });

  // ── Admins ──────────────────────────────────────────────────────────────────
  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@ssb.gov.in' },
    update: { passwordHash },
    create: {
      email: 'admin@ssb.gov.in',
      name: 'Anil Sharma',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'kavita.rao@ssb.gov.in' },
    update: { passwordHash },
    create: {
      email: 'kavita.rao@ssb.gov.in',
      name: 'Kavita Rao',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  console.log('✅ Users seeded');

  // ── Helper to upsert a case + documents ─────────────────────────────────────
  type DocInput = {
    fileName: string;
    docType: string;
    ocrConfidence: number;
  };

  async function upsertCase(opts: {
    id: string;
    title: string;
    personName: string;
    status: CaseStatus;
    riskScore: number;
    riskLevel: RiskLevel;
    officerId: string;
    reviewedById?: string;
    docs: DocInput[];
    auditActions: { actorId: string; action: string; details: string }[];
  }) {
    const c = await prisma.case.upsert({
      where: { id: opts.id },
      update: {
        title: opts.title,
        personName: opts.personName,
        status: opts.status,
        riskScore: opts.riskScore,
        riskLevel: opts.riskLevel,
        officerId: opts.officerId,
        reviewedById: opts.reviewedById ?? null,
      },
      create: {
        id: opts.id,
        title: opts.title,
        personName: opts.personName,
        status: opts.status,
        riskScore: opts.riskScore,
        riskLevel: opts.riskLevel,
        officerId: opts.officerId,
        reviewedById: opts.reviewedById ?? null,
      },
    });

    // Upsert documents (keyed by fileName within case)
    for (const doc of opts.docs) {
      const docId = `${opts.id}-${doc.fileName.replace(/\s/g, '-')}`;
      await prisma.document.upsert({
        where: { id: docId },
        update: { ocrConfidence: doc.ocrConfidence },
        create: {
          id: docId,
          caseId: opts.id,
          fileName: doc.fileName,
          fileUrl: `/storage/${opts.id}/${doc.fileName}`,
          docType: doc.docType,
          sha256Hash: Buffer.from(docId).toString('base64'),
          ocrConfidence: doc.ocrConfidence,
          ocrData: { text: `Scanned content of ${doc.fileName}`, confidence: doc.ocrConfidence },
        },
      });
    }

    // Upsert audit logs
    for (const au of opts.auditActions) {
      const auId = `${opts.id}-${au.action.replace(/\s/g, '-').slice(0, 20)}`;
      await prisma.auditLog.upsert({
        where: { id: auId },
        update: {},
        create: {
          id: auId,
          caseId: opts.id,
          action: au.action,
          actorId: au.actorId,
          details: { message: au.details },
          eventHash: Buffer.from(auId + au.action).toString('base64').slice(0, 64),
        },
      });
    }

    return c;
  }

  // ── 10 Demo Cases ────────────────────────────────────────────────────────────

  // Case 1 — HIGH risk, FLAGGED, waiting for admin review
  await upsertCase({
    id: 'case-001',
    title: 'Identity Verification — Amit Verma',
    personName: 'Amit Verma',
    status: CaseStatus.FLAGGED,
    riskScore: 91.5,
    riskLevel: RiskLevel.HIGH,
    officerId: officer1.id,
    docs: [
      { fileName: 'aadhaar_front.jpg', docType: 'AADHAAR', ocrConfidence: 42.3 },
      { fileName: 'pan_card.jpg', docType: 'PAN', ocrConfidence: 61.0 },
      { fileName: 'photo_id.jpg', docType: 'PHOTO_ID', ocrConfidence: 88.5 },
    ],
    auditActions: [
      { actorId: officer1.id, action: 'CASE_CREATED', details: 'Officer Rajesh Kumar created the case' },
      { actorId: officer1.id, action: 'CASE_FLAGGED', details: 'Flagged due to high AI risk score and low OCR confidence on Aadhaar' },
    ],
  });

  // Case 2 — HIGH risk, FLAGGED, reviewed by Admin Anil
  await upsertCase({
    id: 'case-002',
    title: 'Identity Verification — Mehak Joshi',
    personName: 'Mehak Joshi',
    status: CaseStatus.REJECTED,
    riskScore: 87.2,
    riskLevel: RiskLevel.HIGH,
    officerId: officer1.id,
    reviewedById: admin1.id,
    docs: [
      { fileName: 'passport.jpg', docType: 'PASSPORT', ocrConfidence: 55.1 },
      { fileName: 'driving_license.jpg', docType: 'DL', ocrConfidence: 48.7 },
    ],
    auditActions: [
      { actorId: officer1.id, action: 'CASE_CREATED', details: 'Officer Rajesh Kumar created the case' },
      { actorId: officer1.id, action: 'CASE_FLAGGED', details: 'Documents appear tampered' },
      { actorId: admin1.id, action: 'CASE_REJECTED', details: 'Admin Anil Sharma rejected after manual review — confirmed fake documents' },
    ],
  });

  // Case 3 — HIGH risk, FLAGGED, waiting for admin review
  await upsertCase({
    id: 'case-003',
    title: 'Identity Verification — Suresh Nair',
    personName: 'Suresh Nair',
    status: CaseStatus.FLAGGED,
    riskScore: 78.9,
    riskLevel: RiskLevel.HIGH,
    officerId: officer2.id,
    docs: [
      { fileName: 'aadhaar_front.jpg', docType: 'AADHAAR', ocrConfidence: 69.4 },
      { fileName: 'aadhaar_back.jpg', docType: 'AADHAAR', ocrConfidence: 72.1 },
      { fileName: 'photo.jpg', docType: 'PHOTO_ID', ocrConfidence: 91.0 },
    ],
    auditActions: [
      { actorId: officer2.id, action: 'CASE_CREATED', details: 'Officer Priya Singh created the case' },
      { actorId: officer2.id, action: 'CASE_FLAGGED', details: 'Face mismatch detected by AI' },
    ],
  });

  // Case 4 — MEDIUM risk, UNDER_REVIEW
  await upsertCase({
    id: 'case-004',
    title: 'Identity Verification — Divya Kapoor',
    personName: 'Divya Kapoor',
    status: CaseStatus.UNDER_REVIEW,
    riskScore: 58.4,
    riskLevel: RiskLevel.MEDIUM,
    officerId: officer2.id,
    docs: [
      { fileName: 'voter_id.jpg', docType: 'VOTER_ID', ocrConfidence: 80.3 },
      { fileName: 'pan_card.jpg', docType: 'PAN', ocrConfidence: 77.5 },
    ],
    auditActions: [
      { actorId: officer2.id, action: 'CASE_CREATED', details: 'Officer Priya Singh created the case' },
      { actorId: officer2.id, action: 'CASE_ESCALATED', details: 'Escalated for secondary review — moderate risk score' },
    ],
  });

  // Case 5 — MEDIUM risk, UNDER_REVIEW, waiting for admin
  await upsertCase({
    id: 'case-005',
    title: 'Identity Verification — Arjun Pillai',
    personName: 'Arjun Pillai',
    status: CaseStatus.UNDER_REVIEW,
    riskScore: 63.1,
    riskLevel: RiskLevel.MEDIUM,
    officerId: officer3.id,
    docs: [
      { fileName: 'aadhaar_front.jpg', docType: 'AADHAAR', ocrConfidence: 73.8 },
      { fileName: 'passport.jpg', docType: 'PASSPORT', ocrConfidence: 85.2 },
      { fileName: 'photo_id.jpg', docType: 'PHOTO_ID', ocrConfidence: 67.4 },
    ],
    auditActions: [
      { actorId: officer3.id, action: 'CASE_CREATED', details: 'Officer Dev Mehta created the case' },
      { actorId: officer3.id, action: 'CASE_ESCALATED', details: 'Medium risk — sent for admin review' },
    ],
  });

  // Case 6 — LOW risk, APPROVED by admin Kavita
  await upsertCase({
    id: 'case-006',
    title: 'Identity Verification — Ananya Sharma',
    personName: 'Ananya Sharma',
    status: CaseStatus.APPROVED,
    riskScore: 14.2,
    riskLevel: RiskLevel.LOW,
    officerId: officer1.id,
    reviewedById: admin2.id,
    docs: [
      { fileName: 'aadhaar_front.jpg', docType: 'AADHAAR', ocrConfidence: 95.7 },
      { fileName: 'pan_card.jpg', docType: 'PAN', ocrConfidence: 92.1 },
    ],
    auditActions: [
      { actorId: officer1.id, action: 'CASE_CREATED', details: 'Officer Rajesh Kumar created the case' },
      { actorId: admin2.id, action: 'CASE_APPROVED', details: 'Admin Kavita Rao approved — all documents verified' },
    ],
  });

  // Case 7 — LOW risk, APPROVED by admin Anil
  await upsertCase({
    id: 'case-007',
    title: 'Identity Verification — Rohit Desai',
    personName: 'Rohit Desai',
    status: CaseStatus.APPROVED,
    riskScore: 8.7,
    riskLevel: RiskLevel.LOW,
    officerId: officer3.id,
    reviewedById: admin1.id,
    docs: [
      { fileName: 'passport.jpg', docType: 'PASSPORT', ocrConfidence: 97.3 },
      { fileName: 'voter_id.jpg', docType: 'VOTER_ID', ocrConfidence: 89.0 },
    ],
    auditActions: [
      { actorId: officer3.id, action: 'CASE_CREATED', details: 'Officer Dev Mehta created the case' },
      { actorId: admin1.id, action: 'CASE_APPROVED', details: 'Admin Anil Sharma approved — clean verification' },
    ],
  });

  // Case 8 — PENDING, no admin action yet
  await upsertCase({
    id: 'case-008',
    title: 'Identity Verification — Neha Gupta',
    personName: 'Neha Gupta',
    status: CaseStatus.PENDING,
    riskScore: 22.0,
    riskLevel: RiskLevel.LOW,
    officerId: officer2.id,
    docs: [
      { fileName: 'aadhaar_front.jpg', docType: 'AADHAAR', ocrConfidence: 88.9 },
      { fileName: 'aadhaar_back.jpg', docType: 'AADHAAR', ocrConfidence: 84.2 },
    ],
    auditActions: [
      { actorId: officer2.id, action: 'CASE_CREATED', details: 'Officer Priya Singh created the case — awaiting processing' },
    ],
  });

  // Case 9 — HIGH risk, FLAGGED, officer3 case — for "officer flagging most cases" queries
  await upsertCase({
    id: 'case-009',
    title: 'Identity Verification — Vikram Bose',
    personName: 'Vikram Bose',
    status: CaseStatus.FLAGGED,
    riskScore: 82.6,
    riskLevel: RiskLevel.HIGH,
    officerId: officer1.id,
    docs: [
      { fileName: 'aadhaar_front.jpg', docType: 'AADHAAR', ocrConfidence: 51.3 },
      { fileName: 'pan_card.jpg', docType: 'PAN', ocrConfidence: 44.8 },
      { fileName: 'driving_license.jpg', docType: 'DL', ocrConfidence: 59.0 },
    ],
    auditActions: [
      { actorId: officer1.id, action: 'CASE_CREATED', details: 'Officer Rajesh Kumar created the case' },
      { actorId: officer1.id, action: 'CASE_FLAGGED', details: 'Multiple documents with low OCR confidence — possible forgery' },
    ],
  });

  // Case 10 — MEDIUM risk, PENDING
  await upsertCase({
    id: 'case-010',
    title: 'Identity Verification — Fatima Sheikh',
    personName: 'Fatima Sheikh',
    status: CaseStatus.PENDING,
    riskScore: 44.5,
    riskLevel: RiskLevel.MEDIUM,
    officerId: officer3.id,
    docs: [
      { fileName: 'passport.jpg', docType: 'PASSPORT', ocrConfidence: 76.1 },
      { fileName: 'photo_id.jpg', docType: 'PHOTO_ID', ocrConfidence: 70.5 },
    ],
    auditActions: [
      { actorId: officer3.id, action: 'CASE_CREATED', details: 'Officer Dev Mehta created the case' },
    ],
  });

  console.log('✅ Cases, documents, and audit logs seeded');
  console.log('');
  console.log('Demo credentials (all use password: password123):');
  console.log('  Officers: officer@ssb.gov.in / priya.singh@ssb.gov.in / dev.mehta@ssb.gov.in');
  console.log('  Admins:   admin@ssb.gov.in / kavita.rao@ssb.gov.in');
  console.log('');
  console.log('🌱 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
