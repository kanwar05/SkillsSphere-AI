import express from "express";
import multer from "multer";
import { protect } from "../../middleware/authMiddleware.js";
import {
  startInterview,
  getSession,
  submitAnswer,
  completeInterview,
  getInterviewHistory,
  getSessionResults,
  getAvailableTopics,
  getAIServiceStatus,
} from "./controller.js";

const router = express.Router();

// Multer config for audio uploads (max 10MB, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "audio/webm",
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/ogg",
      "audio/m4a",
      "audio/mp4",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`), false);
    }
  },
});

// All interview routes require authentication
router.use(protect);

// Topic discovery
router.get("/topics", getAvailableTopics);

// AI service status (for debugging)
router.get("/ai-status", getAIServiceStatus);

// Interview session flow
router.post("/start", startInterview);
router.get("/history", getInterviewHistory);
router.get("/:id", getSession);
router.post("/:id/answer", upload.single("audio"), submitAnswer);
router.post("/:id/complete", completeInterview);
router.get("/:id/results", getSessionResults);

export default router;
