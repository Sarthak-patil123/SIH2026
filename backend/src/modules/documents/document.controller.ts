import { Request, Response, NextFunction } from "express";
import { documentService } from "./document.service";
import { LLMVerificationOptions } from "./document.types";

export class DocumentController {
  /**
   * Verify Passport with live Face image.
   * Multipart files: 'passport' (document image) and 'face' (selfie image).
   */
  async verifyPassport(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const passportFile =
        files?.["passport"]?.[0] ||
        files?.["document"]?.[0] ||
        (req.file?.fieldname === "passport" || req.file?.fieldname === "document" ? req.file : undefined);
      const faceFile =
        files?.["face"]?.[0] ||
        files?.["selfie"]?.[0] ||
        files?.["live_photo"]?.[0];

      if (!passportFile || !faceFile) {
        return res.status(400).json({
          error: "MISSING_FILES",
          message: "Both 'passport' and 'face' files are required as multipart/form-data parameters.",
        });
      }

      const options: LLMVerificationOptions = {
        llmModel: req.body.llm_model || (req.query.llm_model as string),
        llmApiBase: req.body.llm_api_base || (req.query.llm_api_base as string),
        llmApiKey: req.body.llm_api_key || (req.query.llm_api_key as string),
      };

      const result = await documentService.verifyPassport(
        passportFile.buffer,
        passportFile.originalname,
        faceFile.buffer,
        faceFile.originalname,
        options
      );

      return res.status(200).json(result);
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Verify Visa document.
   * Multipart file: 'visa' or 'document'.
   */
  async verifyVisa(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file || (req.files as any)?.["visa"]?.[0] || (req.files as any)?.["document"]?.[0];
      if (!file) {
        return res.status(400).json({
          error: "MISSING_FILE",
          message: "Visa document image is required (upload as 'visa' or 'document').",
        });
      }

      const options: LLMVerificationOptions = {
        llmModel: req.body.llm_model || (req.query.llm_model as string),
        llmApiBase: req.body.llm_api_base || (req.query.llm_api_base as string),
        llmApiKey: req.body.llm_api_key || (req.query.llm_api_key as string),
      };

      const result = await documentService.verifyVisa(file.buffer, file.originalname, options);
      return res.status(200).json(result);
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Verify Driving Licence.
   * Multipart file: 'driving_licence' or 'document'.
   */
  async verifyDrivingLicence(req: Request, res: Response, next: NextFunction) {
    try {
      const file =
        req.file ||
        (req.files as any)?.["driving_licence"]?.[0] ||
        (req.files as any)?.["driving_license"]?.[0] ||
        (req.files as any)?.["document"]?.[0];

      if (!file) {
        return res.status(400).json({
          error: "MISSING_FILE",
          message: "Driving licence image is required (upload as 'driving_licence' or 'document').",
        });
      }

      const options: LLMVerificationOptions = {
        llmModel: req.body.llm_model || (req.query.llm_model as string),
        llmApiBase: req.body.llm_api_base || (req.query.llm_api_base as string),
        llmApiKey: req.body.llm_api_key || (req.query.llm_api_key as string),
      };

      const result = await documentService.verifyDrivingLicence(
        file.buffer,
        file.originalname,
        options
      );
      return res.status(200).json(result);
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Verify National ID (Aadhaar, PAN, Voter ID, SSN, Emirates ID, etc.).
   * Multipart file: 'national_id' or 'document'.
   */
  async verifyNationalId(req: Request, res: Response, next: NextFunction) {
    try {
      const file =
        req.file ||
        (req.files as any)?.["national_id"]?.[0] ||
        (req.files as any)?.["document"]?.[0];

      if (!file) {
        return res.status(400).json({
          error: "MISSING_FILE",
          message: "National ID image is required (upload as 'national_id' or 'document').",
        });
      }

      const options: LLMVerificationOptions = {
        llmModel: req.body.llm_model || (req.query.llm_model as string),
        llmApiBase: req.body.llm_api_base || (req.query.llm_api_base as string),
        llmApiKey: req.body.llm_api_key || (req.query.llm_api_key as string),
      };

      const result = await documentService.verifyNationalId(file.buffer, file.originalname, options);
      return res.status(200).json(result);
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Verify Date of Birth Proof (Birth Certificate, School Leaving Certificate, Municipal Record).
   * Multipart file: 'dob_proof' or 'document'.
   */
  async verifyDobProof(req: Request, res: Response, next: NextFunction) {
    try {
      const file =
        req.file ||
        (req.files as any)?.["dob_proof"]?.[0] ||
        (req.files as any)?.["document"]?.[0];

      if (!file) {
        return res.status(400).json({
          error: "MISSING_FILE",
          message: "DOB proof image is required (upload as 'dob_proof' or 'document').",
        });
      }

      const options: LLMVerificationOptions = {
        llmModel: req.body.llm_model || (req.query.llm_model as string),
        llmApiBase: req.body.llm_api_base || (req.query.llm_api_base as string),
        llmApiKey: req.body.llm_api_key || (req.query.llm_api_key as string),
      };

      const result = await documentService.verifyDobProof(file.buffer, file.originalname, options);
      return res.status(200).json(result);
    } catch (err: any) {
      next(err);
    }
  }
}

export const documentController = new DocumentController();
