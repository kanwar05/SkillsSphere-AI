import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import User from "../database/models/User.js";
import Resume from "../database/models/Resume.js";
import MatchResult from "../database/models/MatchResult.js";
import LearningProgress from "../database/models/LearningProgress.js";
import JobApplication from "../database/models/JobApplication.js";
import CoverLetter from "../database/models/CoverLetter.js";
import InterviewSession from "../database/models/InterviewSession.js";
import AnalysisHistory from "../database/models/AnalysisHistory.js";
import ClassroomSession from "../database/models/ClassroomSession.js";
import JobPosting from "../database/models/JobPosting.js";

/**
 * Sweeps and deletes all physical files and MongoDB documents associated with a user.
 * This ensures GDPR compliance and prevents storage bloat.
 * 
 * @param {string|mongoose.Types.ObjectId} userId - The ID of the user to delete
 * @returns {Promise<void>}
 */
export const cascadeDeleteUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let resumes = [];
  let interviewSessions = [];

  try {
    // 2. Find and delete user resumes
    resumes = await Resume.find({ user: userId }).session(session);
    await Resume.deleteMany({ user: userId }, { session });

    // 3. Find and delete user interview sessions
    interviewSessions = await InterviewSession.find({ userId }).session(session);
    await InterviewSession.deleteMany({ userId }, { session });

    // 4. Delete other student-related relational data
    await MatchResult.deleteMany({ user: userId }, { session });
    await LearningProgress.deleteMany({ user: userId }, { session });
    await JobApplication.deleteMany({ applicant: userId }, { session });
    await CoverLetter.deleteMany({ user: userId }, { session });
    await AnalysisHistory.deleteMany({ user: userId }, { session });
    await ClassroomSession.deleteMany({ host: userId }, { session });

    // 5. If recruiter: delete posted jobs and cascading applications to them
    const postedJobs = await JobPosting.find({ recruiter: userId }).session(session);
    if (postedJobs.length > 0) {
      const jobIds = postedJobs.map((j) => j._id);
      await JobApplication.deleteMany({ job: { $in: jobIds } }, { session });
      await JobPosting.deleteMany({ recruiter: userId }, { session });
    }

    // 6. Delete User document itself
    await User.findByIdAndDelete(userId, { session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction aborted in cascadeDeleteUser:", error);
    throw error;
  } finally {
    session.endSession();
  }

  // 1. Delete physical profile picture (avatar) if it exists locally
  if (
    user.profilePic &&
    (user.profilePic.includes("/uploads/avatars/") ||
      user.profilePic.includes("/api/files/avatars/"))
  ) {
    const filename = path.basename(user.profilePic.split("?")[0]);
    const filePath = path.join(process.cwd(), "src", "uploads", "avatars", filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete avatar file:", err);
      }
    }
  }

  // Delete physical PDF/DOCX files
  for (const resume of resumes) {
    if (resume.file && resume.file.path) {
      const absolutePath = path.isAbsolute(resume.file.path)
        ? resume.file.path
        : path.join(process.cwd(), resume.file.path);
      if (fs.existsSync(absolutePath)) {
        try {
          fs.unlinkSync(absolutePath);
        } catch (err) {
          console.error("Failed to delete resume file:", err);
        }
      }
    }
  }

  // Delete physical audio files
  for (const interviewSession of interviewSessions) {
    if (interviewSession.answers && Array.isArray(interviewSession.answers)) {
      for (const answer of interviewSession.answers) {
        if (answer.audioPath) {
          const absolutePath = path.isAbsolute(answer.audioPath)
            ? answer.audioPath
            : path.join(process.cwd(), answer.audioPath);
          if (fs.existsSync(absolutePath)) {
            try {
              fs.unlinkSync(absolutePath);
            } catch (err) {
              console.error("Failed to delete interview audio file:", err);
            }
          }
        }
      }
    }
  }
};
