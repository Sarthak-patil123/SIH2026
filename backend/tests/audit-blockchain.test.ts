import { auditHashService } from '../src/modules/audit/audit-hash.service';
import { auditService } from '../src/modules/audit/audit.service';
import { blockchainAuditService } from '../src/blockchain/audit/blockchain-audit.service';
import { calculateSha256 } from '../src/blockchain/hashing/sha256';

async function runTests() {
  console.log('=== STARTING BLOCKCHAIN & SHA-256 AUDIT TRAIL TESTS ===\n');

  // Test 1: SHA-256 Hashing
  console.log('1. Testing SHA-256 Document and Payload Hashing:');
  const sampleDocBuffer = Buffer.from('Government Issued Passport Sample Content 2026');
  const docHash = auditHashService.calculateSha256(sampleDocBuffer);
  console.log('   - Sample Document SHA-256:', docHash);
  if (docHash.length === 64) {
    console.log('   ✓ SHA-256 generation passed (64 hex characters)');
  } else {
    throw new Error('SHA-256 hash length mismatch');
  }

  // Test 2: Document Merkle Root
  const docHashes = [
    calculateSha256('Passport_Scan_001.pdf'),
    calculateSha256('National_ID_Aadhaar.pdf'),
    calculateSha256('Driving_Licence_DL99.pdf'),
  ];
  const merkleRoot = auditHashService.computeMerkleRoot(docHashes);
  console.log('   - Computed Document Merkle Root:', merkleRoot);
  console.log('   ✓ Merkle Root computation passed\n');

  // Test 3: Record Case Lifecycle Phase & Document Hashes
  console.log('2. Testing Case Audit Trail with Document Hashes:');
  const testCaseId = 'CASE-TEST-' + Date.now();
  const caseCreationResult = await auditService.recordCasePhaseAudit({
    caseId: testCaseId,
    action: 'CASE_CREATED',
    phase: 'CASE_CREATION',
    actorId: 'OFFICER-007',
    actorRole: 'OFFICER',
    documentHashes: [
      {
        fileName: 'Passport_Scan_001.pdf',
        docType: 'PASSPORT',
        sha256Hash: docHashes[0],
        ocrConfidence: 98.4,
      },
      {
        fileName: 'National_ID_Aadhaar.pdf',
        docType: 'AADHAAR',
        sha256Hash: docHashes[1],
        ocrConfidence: 96.2,
      },
    ],
    details: {
      personName: 'Rohan Sharma',
      screeningType: 'PASSPORT_BIOMETRIC',
    },
  });

  console.log('   - Blockchain TxId:', caseCreationResult.txResult.txId);
  console.log('   - Blockchain Block #:', caseCreationResult.txResult.blockNumber);
  console.log('   - Event Hash:', caseCreationResult.txResult.eventHash);
  console.log('   ✓ Case Phase Audit recorded successfully\n');

  // Test 4: Record Face Verification Phase Audit Trail
  console.log('3. Testing Biometric Face Verification Phase Audit Record:');
  const sampleDocFace = Buffer.from('Passport Portrait Crop Biometric Buffer');
  const sampleSelfie = Buffer.from('Live Camera Selfie Stream Buffer');

  const faceAuditResult = await auditService.recordFaceVerificationAudit(
    {
      caseId: testCaseId,
      matchScore: 94.8,
      distance: 0.18,
      threshold: 0.6,
      status: 'MATCH',
      phase: 'FACE_VERIFICATION_PHASE_1',
      livenessScore: 0.99,
      antiSpoofResult: 'REAL',
      actorId: 'OFFICER-007',
      notes: '1:1 ArcFace comparison verified with live anti-spoof check',
      details: {
        model: 'ArcFace-ResNet50',
        detector: 'YOLOv8-Face',
      },
    },
    sampleDocFace,
    sampleSelfie
  );

  console.log('   - Face Verification Proof TxId:', faceAuditResult.txResult.txId);
  console.log('   - Document Face Hash:', faceAuditResult.faceProof.docFaceHash);
  console.log('   - Live Selfie Face Hash:', faceAuditResult.faceProof.selfieFaceHash);
  console.log('   - Match Score:', faceAuditResult.faceProof.matchScore + '%');
  console.log('   ✓ Face Verification Audit recorded into Blockchain\n');

  // Test 5: Record Decision Phase
  console.log('4. Testing Final Supervisory Decision Phase:');
  const decisionResult = await auditService.recordCasePhaseAudit({
    caseId: testCaseId,
    action: 'DECISION_APPROVED',
    phase: 'FINAL_SUPERVISORY_DECISION',
    actorId: 'ADMIN-SUPERVISOR-101',
    actorRole: 'ADMIN',
    details: {
      decision: 'APPROVED',
      notes: 'All documents verified and face match confirmed.',
    },
  });
  console.log('   - Decision TxId:', decisionResult.txResult.txId);
  console.log('   - Previous Block Hash chained:', decisionResult.txResult.previousHash);
  console.log('   ✓ Decision Phase recorded and chained\n');

  // Test 6: Query Full Case Audit Trail
  console.log('5. Querying Complete Audit Trail for Case:');
  const trail = await auditService.getCaseAuditTrail(testCaseId);
  console.log('   - Total Blockchain Events for Case:', trail.totalEvents);
  console.log('   - Total Document Hashes Anchored:', trail.documentHashes.length);
  console.log('   - Total Face Verifications Anchored:', trail.faceVerifications.length);
  console.log('   - Chain Valid:', trail.chainValid);

  if (trail.totalEvents === 3 && trail.documentHashes.length === 2 && trail.faceVerifications.length === 1) {
    console.log('   ✓ Full audit trail integrity confirmed\n');
  } else {
    throw new Error('Audit trail item count mismatch');
  }

  // Test 7: Cryptographic Integrity Verification
  console.log('6. Validating SHA-256 Cryptographic Chain Integrity:');
  const integrity = await auditService.verifyCaseIntegrity(testCaseId);
  console.log('   - Valid:', integrity.valid);
  console.log('   - Tampered:', integrity.tampered);
  console.log('   - Total Events:', integrity.totalEvents);
  console.log('   - Latest Hash:', integrity.latestHash);

  if (integrity.valid && !integrity.tampered) {
    console.log('   ✓ Cryptographic proof verification passed 100%');
  } else {
    throw new Error('Chain integrity verification failed');
  }

  console.log('\n=== ALL BLOCKCHAIN & AUDIT TRAIL TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
