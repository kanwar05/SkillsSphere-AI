import {
  createSession,
  getSessionById,
  processAnswerSubmission,
  finalizeInterview,
  getUserInterviewHistory,
  getSessionResults as getResults,
  listAvailableTopics,
} from "./service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";

/**
 * @desc    Start a new interview session
 * @route   POST /api/interviews/start
 * @access  Private
 */
export const startInterview = asyncHandler(async (req, res) => {
  const { topic, difficulty } = req.body;

  if (!topic) {
    throw new AppError("Topic is required to start an interview", 400);
  }

  const session = await createSession({
    userId: req.user._id,
    topic,
    difficulty: difficulty || "medium",
  });

  res.status(201).json({
    success: true,
    message: "Interview session started",
    data: {
      sessionId: session._id,
      topic: session.topic,
      difficulty: session.difficulty,
      totalQuestions: session.totalQuestions,
      currentQuestion: session.answers[0]
        ? {
            index: 0,
            questionText: session.answers[0].questionText,
            questionId: session.answers[0].questionId,
          }
        : null,
    },
  });
});

/**
 * @desc    Get session details
 * @route   GET /api/interviews/:id
 * @access  Private
 */
export const getSession = asyncHandler(async (req, res) => {
  const session = await getSessionById(req.params.id, req.user._id);

  if (!session) {
    throw new AppError("Interview session not found", 404);
  }

  res.status(200).json({
    success: true,
    data: session,
  });
});

/**
 * @desc    Submit an answer for the current question
 * @route   POST /api/interviews/:id/answer
 * @access  Private
 */
export const submitAnswer = asyncHandler(async (req, res) => {
  const { transcript } = req.body;
  const audioFile = req.file || null;

  if (!transcript && !audioFile) {
    throw new AppError(
      "Either a transcript or audio file is required",
      400
    );
  }

  const result = await processAnswerSubmission({
    sessionId: req.params.id,
    userId: req.user._id,
    transcript,
    audioFile,
  });

  res.status(200).json({
    success: true,
    message: "Answer submitted successfully",
    data: result,
  });
});

/**
 * @desc    Complete the interview and calculate final scores
 * @route   POST /api/interviews/:id/complete
 * @access  Private
 */
export const completeInterview = asyncHandler(async (req, res) => {
  const result = await finalizeInterview(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    message: "Interview completed",
    data: result,
  });
});

/**
 * @desc    Get user's interview history
 * @route   GET /api/interviews/history
 * @access  Private
 */
export const getInterviewHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const history = await getUserInterviewHistory(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data: history,
  });
});

/**
 * @desc    Get detailed results for a specific session
 * @route   GET /api/interviews/:id/results
 * @access  Private
 */
export const getSessionResults = asyncHandler(async (req, res) => {
  const results = await getResults(req.params.id, req.user._id);

  if (!results) {
    throw new AppError("Interview session not found", 404);
  }

  res.status(200).json({
    success: true,
    data: results,
  });
});

/**
 * @desc    List available interview topics
 * @route   GET /api/interviews/topics
 * @access  Private
 */
export const getAvailableTopics = asyncHandler(async (req, res) => {
  const topics = await listAvailableTopics();

  res.status(200).json({
    success: true,
    data: topics,
  });
});
