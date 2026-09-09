import { Router } from "express";
import multer from "multer";
import { documentController } from "./document.controller";

export const documentRoutes = Router();

// Store files in memory so they can be forwarded directly via axios to AI service
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

// ── 1. Passport Verification (Requires 'passport' image and 'face' live selfie)
const passportUpload = upload.fields([
  { name: "passport", maxCount: 1 },
  { name: "document", maxCount: 1 },
  { name: "face", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "live_photo", maxCount: 1 },
]);
documentRoutes.post("/passport", passportUpload, (req, res, next) =>
  documentController.verifyPassport(req, res, next)
);
documentRoutes.post("/verify/passport", passportUpload, (req, res, next) =>
  documentController.verifyPassport(req, res, next)
);

// ── 2. Visa Verification
const visaUpload = upload.fields([
  { name: "visa", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);
documentRoutes.post("/visa", visaUpload, (req, res, next) =>
  documentController.verifyVisa(req, res, next)
);
documentRoutes.post("/verify/visa", visaUpload, (req, res, next) =>
  documentController.verifyVisa(req, res, next)
);

// ── 3. Driving Licence Verification
const dlUpload = upload.fields([
  { name: "driving_licence", maxCount: 1 },
  { name: "driving_license", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);
documentRoutes.post("/driving-licence", dlUpload, (req, res, next) =>
  documentController.verifyDrivingLicence(req, res, next)
);
documentRoutes.post("/driving-license", dlUpload, (req, res, next) =>
  documentController.verifyDrivingLicence(req, res, next)
);
documentRoutes.post("/verify/driving-licence", dlUpload, (req, res, next) =>
  documentController.verifyDrivingLicence(req, res, next)
);

// ── 4. National ID Verification (Aadhaar, PAN, Voter ID, SSN, Emirates ID, etc.)
const nationalIdUpload = upload.fields([
  { name: "national_id", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);
documentRoutes.post("/national-id", nationalIdUpload, (req, res, next) =>
  documentController.verifyNationalId(req, res, next)
);
documentRoutes.post("/verify/national-id", nationalIdUpload, (req, res, next) =>
  documentController.verifyNationalId(req, res, next)
);

// ── 5. Date of Birth Proof Verification (Birth Certificate, School Cert, etc.)
const dobUpload = upload.fields([
  { name: "dob_proof", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);
documentRoutes.post("/dob-proof", dobUpload, (req, res, next) =>
  documentController.verifyDobProof(req, res, next)
);
documentRoutes.post("/verify/dob-proof", dobUpload, (req, res, next) =>
  documentController.verifyDobProof(req, res, next)
);
