const express = require("express");
const User = require("../models/User");
const respond = require("../middleware/respond");
const { requireJwt } = require("../middleware/auth");
const { validateBody, Joi } = require("../middleware/validation");

const router = express.Router();

const uploadAvatarSchema = Joi.object({
  imageBase64: Joi.string().min(32).required(),
});

// POST /api/auth/profile/avatar - Upload avatar (base64)
router.post(
  "/profile/avatar",
  requireJwt,
  validateBody(uploadAvatarSchema),
  async (req, res) => {
    try {
      const idHeader = req.headers["x-user-id"];
      const emailHeader = req._userEmail || req.headers["x-user-email"];
      let doc = null;
      if (idHeader) {
        try {
          doc = await User.findById(idHeader);
        } catch (_) {
          doc = null;
        }
      }
      if (!doc && emailHeader) {
        doc = await User.findOne({ email: emailHeader });
      }
      if (!doc)
        return respond.error(
          res,
          401,
          "unauthorized",
          "Unauthorized: user not found",
        );

      const raw = String(req.body.imageBase64 || "");
      let mime = "";
      let dataStr = raw;
      if (raw.startsWith("data:")) {
        const parts = raw.split(",");
        const header = parts[0] || "";
        dataStr = parts[1] || "";
        const m = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/);
        mime = m ? m[1] : "";
      }
      const buf = Buffer.from(dataStr, "base64");
      if (!buf || buf.length < 1000)
        return respond.error(res, 400, "invalid_image", "Invalid image");
      let ext = "jpg";
      if (mime.includes("png")) ext = "png";
      if (mime.includes("jpeg")) ext = "jpg";
      if (mime.includes("webp")) ext = "webp";

      // Try to upload to IPFS first (if available)
      const ipfsService = require("../lib/ipfsService");
      let avatarUrl = "";
      let avatarIpfsCid = "";

      if (ipfsService.isAvailable()) {
        try {
          const fileName = `avatar_${String(doc._id)}_${Date.now()}.${ext}`;
          const { cid } = await ipfsService.uploadFile(buf, fileName);
          await ipfsService.pinFile(cid).catch((err) => {
            console.warn("Failed to pin avatar to IPFS", {
              cid,
              error: err.message,
            });
          });
          avatarIpfsCid = cid;
          avatarUrl = ipfsService.getGatewayUrl(cid);

          // Store CID in DocumentStorage contract (non-blocking)
          try {
            const { auditClient } = require("../../../../shared/lib/httpClient");
            await auditClient
              .post(
                "/api/audit/store-document",
                {
                  userId: String(doc._id),
                  docType: "AVATAR",
                  ipfsCid: cid,
                },
              )
              .catch((err) => {
                console.warn("Failed to store avatar CID in blockchain", {
                  error: err.message,
                });
              });
          } catch (blockchainError) {
            // Non-blocking - continue even if blockchain storage fails
            console.warn("Blockchain storage failed for avatar", {
              error: blockchainError.message,
            });
          }
        } catch (ipfsError) {
          console.error("IPFS upload failed, using local storage fallback", {
            error: ipfsError.message,
          });
          // Fallback to local storage
          const path = require("path");
          const fs = require("fs");
          const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
          const avatarsDir = path.join(uploadsDir, "avatars");
          try {
            fs.mkdirSync(avatarsDir, { recursive: true });
          } catch (_) {}
          const filename = `${String(doc._id)}_${Date.now()}.${ext}`;
          const filePath = path.join(avatarsDir, filename);
          await fs.promises.writeFile(filePath, buf);
          avatarUrl = `/uploads/avatars/${filename}`;
        }
      } else {
        // IPFS not available, use local storage
        const path = require("path");
        const fs = require("fs");
        const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
        const avatarsDir = path.join(uploadsDir, "avatars");
        try {
          fs.mkdirSync(avatarsDir, { recursive: true });
        } catch (_) {}
        const filename = `${String(doc._id)}_${Date.now()}.${ext}`;
        const filePath = path.join(avatarsDir, filename);
        await fs.promises.writeFile(filePath, buf);
        avatarUrl = `/uploads/avatars/${filename}`;
      }

      doc.avatarUrl = avatarUrl;
      if (avatarIpfsCid) doc.avatarIpfsCid = avatarIpfsCid;
      await doc.save();
      return res.json({
        success: true,
        avatarUrl: doc.avatarUrl,
        avatarIpfsCid: doc.avatarIpfsCid || null,
      });
    } catch (err) {
      console.error("POST /api/auth/profile/avatar error:", err);
      return respond.error(
        res,
        500,
        "avatar_upload_failed",
        "Failed to upload avatar",
      );
    }
  },
);

// POST /api/auth/profile/avatar-file - multipart upload
router.post("/profile/avatar-file", requireJwt, async (req, res) => {
  try {
    const idHeader = req.headers["x-user-id"];
    const emailHeader = req._userEmail || req.headers["x-user-email"];
    let doc = null;
    if (idHeader) {
      try {
        doc = await User.findById(idHeader);
      } catch (_) {
        doc = null;
      }
    }
    if (!doc && emailHeader) {
      doc = await User.findOne({ email: emailHeader });
    }
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const multer = require("multer");
    const path = require("path");
    const fs = require("fs");
    const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
    const avatarsDir = path.join(uploadsDir, "avatars");
    try {
      fs.mkdirSync(avatarsDir, { recursive: true });
    } catch (_) {}
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, avatarsDir),
      filename: (_req, file, cb) => {
        const ext =
          path.extname(file.originalname || ".jpg").toLowerCase() || ".jpg";
        cb(null, `${String(doc._id)}_${Date.now()}${ext}`);
      },
    });
    const upload = multer({ storage }).single("avatar");

    upload(req, res, async (err) => {
      if (err) return respond.error(res, 400, "upload_failed", "Upload failed");
      const file = req.file;
      if (!file) return respond.error(res, 400, "no_file", "No file uploaded");

      const { scanFile } = require("../../../../shared/fileScan");
      const scanResult = await scanFile(file.path);
      if (!scanResult.clean) {
        try {
          await fs.promises.unlink(file.path);
        } catch (_) {}
        return respond.error(
          res,
          400,
          "file_rejected",
          "File could not be accepted. Please try a different file.",
        );
      }

      // Try to upload to IPFS first (if available)
      const ipfsService = require("../lib/ipfsService");
      let avatarUrl = "";
      let avatarIpfsCid = "";

      if (ipfsService.isAvailable()) {
        try {
          const fileBuffer = await fs.promises.readFile(file.path);
          const fileName = file.originalname || path.basename(file.path);
          const { cid } = await ipfsService.uploadFile(fileBuffer, fileName);
          await ipfsService.pinFile(cid).catch((err) => {
            console.warn("Failed to pin avatar to IPFS", {
              cid,
              error: err.message,
            });
          });
          avatarIpfsCid = cid;
          avatarUrl = ipfsService.getGatewayUrl(cid);

          // Store CID in DocumentStorage contract (non-blocking)
          try {
            const { auditClient } = require("../../../../shared/lib/httpClient");
            await auditClient
              .post(
                "/api/audit/store-document",
                {
                  userId: String(doc._id),
                  docType: "AVATAR",
                  ipfsCid: cid,
                },
              )
              .catch((err) => {
                console.warn("Failed to store avatar CID in blockchain", {
                  error: err.message,
                });
              });
          } catch (blockchainError) {
            // Non-blocking - continue even if blockchain storage fails
            console.warn("Blockchain storage failed for avatar", {
              error: blockchainError.message,
            });
          }

          // Delete local file after IPFS upload (optional - can keep for backup)
          try {
            await fs.promises.unlink(file.path);
          } catch (unlinkErr) {
            console.warn("Failed to delete local file after IPFS upload", {
              path: file.path,
            });
          }
        } catch (ipfsError) {
          console.error("IPFS upload failed, using local storage fallback", {
            error: ipfsError.message,
          });
          // Fallback to local storage
          avatarUrl = `/uploads/avatars/${path.basename(file.path)}`;
        }
      } else {
        // IPFS not available, use local storage
        avatarUrl = `/uploads/avatars/${path.basename(file.path)}`;
      }

      doc.avatarUrl = avatarUrl;
      if (avatarIpfsCid) doc.avatarIpfsCid = avatarIpfsCid;
      await doc.save();
      return res.json({
        success: true,
        avatarUrl: doc.avatarUrl,
        avatarIpfsCid: doc.avatarIpfsCid || null,
      });
    });
  } catch (err) {
    console.error("POST /api/auth/profile/avatar-file error:", err);
    return respond.error(
      res,
      500,
      "avatar_upload_failed",
      "Failed to upload avatar",
    );
  }
});

// DELETE /api/auth/profile/avatar - Delete avatar
router.delete("/profile/avatar", requireJwt, async (req, res) => {
  try {
    const idHeader = req.headers["x-user-id"];
    const emailHeader = req._userEmail || req.headers["x-user-email"];
    let doc = null;
    if (idHeader) {
      try {
        doc = await User.findById(idHeader);
      } catch (_) {
        doc = null;
      }
    }
    if (!doc && emailHeader) {
      doc = await User.findOne({ email: emailHeader });
    }
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const path = require("path");
    const fs = require("fs");
    const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
    const avatarsDir = path.join(uploadsDir, "avatars");
    const basename = path.basename(String(doc.avatarUrl || ""));
    const filePath = basename ? path.join(avatarsDir, basename) : "";
    try {
      if (filePath) await fs.promises.unlink(filePath);
    } catch (_) {}
    doc.avatarUrl = "";
    await doc.save();
    return res.json({ success: true, message: "Avatar deleted" });
  } catch (err) {
    console.error("DELETE /api/auth/profile/avatar error:", err);
    return respond.error(
      res,
      500,
      "avatar_delete_failed",
      "Failed to delete avatar",
    );
  }
});

// POST /api/auth/profile/avatar/delete - Delete avatar (alternative endpoint)
router.post("/profile/avatar/delete", requireJwt, async (req, res) => {
  try {
    const idHeader = req.headers["x-user-id"];
    const emailHeader = req._userEmail || req.headers["x-user-email"];
    let doc = null;
    if (idHeader) {
      try {
        doc = await User.findById(idHeader);
      } catch (_) {
        doc = null;
      }
    }
    if (!doc && emailHeader) {
      doc = await User.findOne({ email: emailHeader });
    }
    if (!doc)
      return respond.error(
        res,
        401,
        "unauthorized",
        "Unauthorized: user not found",
      );

    const path = require("path");
    const fs = require("fs");
    const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads");
    const avatarsDir = path.join(uploadsDir, "avatars");
    const basename = path.basename(String(doc.avatarUrl || ""));
    const filePath = basename ? path.join(avatarsDir, basename) : "";
    try {
      if (filePath) await fs.promises.unlink(filePath);
    } catch (_) {}
    doc.avatarUrl = "";
    await doc.save();
    return res.json({ success: true, message: "Avatar deleted" });
  } catch (err) {
    console.error("POST /api/auth/profile/avatar/delete error:", err);
    return respond.error(
      res,
      500,
      "avatar_delete_failed",
      "Failed to delete avatar",
    );
  }
});

module.exports = router;
