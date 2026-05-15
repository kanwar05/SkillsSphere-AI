import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  startInterview,
  getSession,
  submitAnswer,
  completeInterview,
  getInterviewHistory,
  getSessionResults,
  getAvailableTopics,
} from "./controller.js";

const router = express.Router();

// All interview routes require authentication
router.use(protect);

// Topic discovery
router.get("/topics", getAvailableTopics);

// Interview session flow
router.post("/start", startInterview);
router.get("/history", getInterviewHistory);
router.get("/:id", getSession);
router.post("/:id/answer", submitAnswer);
router.post("/:id/complete", completeInterview);
router.get("/:id/results", getSessionResults);

export default router;
