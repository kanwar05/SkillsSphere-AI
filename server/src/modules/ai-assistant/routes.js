import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { generateChatResponse } from "./controller.js";

const router = express.Router();

router.post("/", protect, generateChatResponse);

export default router;
