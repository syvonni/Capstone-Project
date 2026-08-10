const path = require("path");
const fs = require("fs");
const multer = require("multer");
const logger = require("../../lib/logger");
const { scanFile } = require("../../../../../shared/fileScan");

class FileUploadService {
  constructor() {
    this.businessUploadsRoot = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "uploads",
      "business-registration",
    );
    this.renewalUploadsRoot = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "uploads",
      "business-renewal",
    );
    this.ownerIdUploadRoot = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "uploads",
      "owner-ids",
    );

    this.ALLOWED_MIMETYPES = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    this.MAX_OWNER_ID_SIZE = 5 * 1024 * 1024; // 5 MB
  }

  /**
   * Ensure directory exists
   */
  ensureDir(dir) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (_) {}
  }

  /**
   * File filter for multer
   */
  fileFilter(req, file, cb) {
    if (!this.ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          "File type not allowed. Accepted: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX",
        ),
        false,
      );
    }
    cb(null, true);
  }

  /**
   * Get upload storage for business documents
   */
  getUploadStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const { businessId } = req.params;
        const businessDir = path.join(
          this.businessUploadsRoot,
          businessId || "unknown",
        );
        this.ensureDir(businessDir);
        cb(null, businessDir);
      },
      filename: (req, file, cb) => {
        const fieldName = (req.body?.fieldName || "file")
          .toString()
          .replace(/[^a-zA-Z0-9_-]/g, "");
        const safeOriginal = path
          .basename(file.originalname)
          .replace(/[^a-zA-Z0-9._-]/g, "");
        const stamp = Date.now();
        cb(null, `${fieldName}_${stamp}_${safeOriginal}`);
      },
    });
  }

  /**
   * Get upload storage for renewal documents
   */
  getRenewalUploadStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const { businessId, renewalId } = req.params;
        const renewalDir = path.join(
          this.renewalUploadsRoot,
          businessId || "unknown",
          renewalId || "unknown",
        );
        this.ensureDir(renewalDir);
        cb(null, renewalDir);
      },
      filename: (req, file, cb) => {
        const fieldName = (req.body?.fieldName || "file")
          .toString()
          .replace(/[^a-zA-Z0-9_-]/g, "");
        const safeOriginal = path
          .basename(file.originalname)
          .replace(/[^a-zA-Z0-9._-]/g, "");
        const stamp = Date.now();
        cb(null, `${fieldName}_${stamp}_${safeOriginal}`);
      },
    });
  }

  /**
   * Get upload storage for owner ID
   */
  getOwnerIdUploadStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const userId = req._userId || "unknown";
        const userDir = path.join(this.ownerIdUploadRoot, String(userId));
        this.ensureDir(userDir);
        cb(null, userDir);
      },
      filename: (req, file, cb) => {
        const side =
          (req.body?.side || "front").toString().replace(/[^a-zA-Z0-9_-]/g, "") ||
          "front";
        const stamp = Date.now();
        cb(null, `${side}_${stamp}.jpg`);
      },
    });
  }

  /**
   * Get multer upload middleware for business documents
   */
  getUploadMiddleware() {
    return multer({
      storage: this.getUploadStorage(),
      fileFilter: this.fileFilter.bind(this),
      limits: { fileSize: this.MAX_FILE_SIZE },
    });
  }

  /**
   * Get multer upload middleware for renewal documents
   */
  getRenewalUploadMiddleware() {
    return multer({
      storage: this.getRenewalUploadStorage(),
      fileFilter: this.fileFilter.bind(this),
      limits: { fileSize: this.MAX_FILE_SIZE },
    });
  }

  /**
   * Get multer upload middleware for owner ID
   */
  getOwnerIdUploadMiddleware() {
    return multer({
      storage: this.getOwnerIdUploadStorage(),
      limits: { fileSize: this.MAX_OWNER_ID_SIZE },
    });
  }

  /**
   * Upload owner ID with IPFS fallback
   */
  async uploadOwnerId(userId, file, side) {
    if (!file) {
      const error = new Error("No file uploaded");
      error.code = "FILE_REQUIRED";
      error.status = 400;
      throw error;
    }

    const scanResult = await scanFile(file.path);
    if (!scanResult.clean) {
      try {
        await fs.promises.unlink(file.path);
      } catch (_) {}
      const error = new Error("File could not be accepted. Please try a different file.");
      error.code = "FILE_REJECTED";
      error.status = 400;
      throw error;
    }

    const normalizedSide =
      side.toString().replace(/[^a-zA-Z0-9_-]/g, "") || "front";

    let ipfsService = null;
    try {
      ipfsService = require("../../lib/ipfsService");
      if (!ipfsService.isAvailable()) {
        await ipfsService.initialize();
      }
    } catch (err) {
      logger.warn("IPFS service not available for owner ID upload", {
        error: err.message,
      });
    }

    if (ipfsService && ipfsService.isAvailable()) {
      try {
        const fileBuffer = await fs.promises.readFile(file.path);
        const fileName = `id_${normalizedSide}_${userId}_${Date.now()}.jpg`;
        const { cid, size } = await ipfsService.uploadFile(
          fileBuffer,
          fileName,
        );
        await ipfsService.pinFile(cid).catch((err) => {
          logger.warn("Failed to pin owner ID to IPFS", {
            cid,
            error: err.message,
          });
        });
        const url = ipfsService.getGatewayUrl(cid);
        try {
          await fs.promises.unlink(file.path);
        } catch (_) {}
        logger.info("Owner ID uploaded to IPFS", { cid, side: normalizedSide, userId });
        return { url, ipfsCid: cid, size };
      } catch (ipfsErr) {
        logger.error("IPFS upload failed for owner ID", {
          error: ipfsErr.message,
        });
      }
    }

    // Fallback: local storage
    const url = `/uploads/owner-ids/${userId}/${path.basename(file.path)}`;
    logger.info("Owner ID saved to local storage", { url, side: normalizedSide, userId });
    return { url, ipfsCid: null, fallback: true };
  }

  /**
   * Upload business document with IPFS fallback
   */
  async uploadBusinessDocument(businessId, file, fieldName) {
    if (!file) {
      const error = new Error("No file uploaded");
      error.code = "FILE_REQUIRED";
      error.status = 400;
      throw error;
    }

    const scanResult = await scanFile(file.path);
    if (!scanResult.clean) {
      try {
        await fs.promises.unlink(file.path);
      } catch (_) {}
      const error = new Error("File could not be accepted. Please try a different file.");
      error.code = "FILE_REJECTED";
      error.status = 400;
      throw error;
    }

    let ipfsService = null;
    try {
      ipfsService = require("../../lib/ipfsService");
      if (!ipfsService.isAvailable()) {
        await ipfsService.initialize();
      }
    } catch (err) {
      logger.warn("IPFS service not available for business document upload", {
        error: err.message,
      });
    }

    if (ipfsService && ipfsService.isAvailable()) {
      try {
        const fileBuffer = await fs.promises.readFile(file.path);
        const fileName = `${fieldName}_${businessId}_${Date.now()}_${file.originalname}`;
        const { cid, size } = await ipfsService.uploadFile(
          fileBuffer,
          fileName,
        );
        await ipfsService.pinFile(cid).catch((err) => {
          logger.warn("Failed to pin business document to IPFS", {
            cid,
            error: err.message,
          });
        });
        const url = ipfsService.getGatewayUrl(cid);
        try {
          await fs.promises.unlink(file.path);
        } catch (_) {}
        logger.info("Business document uploaded to IPFS", { cid, businessId, fieldName });
        return { url, ipfsCid: cid, size };
      } catch (ipfsErr) {
        logger.error("IPFS upload failed for business document", {
          error: ipfsErr.message,
        });
      }
    }

    // Fallback: local storage
    const url = `/uploads/business-registration/${businessId}/${path.basename(file.path)}`;
    logger.info("Business document saved to local storage", { url, businessId, fieldName });
    return { url, ipfsCid: null, fallback: true };
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(__dirname, "..", "..", "..", filePath);
      await fs.promises.unlink(fullPath);
      return { success: true };
    } catch (err) {
      logger.error("Failed to delete file", { error: err.message, filePath });
      const error = new Error("Failed to delete file");
      error.code = "DELETE_FAILED";
      error.status = 500;
      throw error;
    }
  }
}

module.exports = new FileUploadService();
