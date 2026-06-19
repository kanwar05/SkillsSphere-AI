import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

savedJobSchema.index({ student: 1, job: 1 }, { unique: true });
savedJobSchema.index({ student: 1, createdAt: -1 });

const SavedJob = mongoose.model("SavedJob", savedJobSchema);

export default SavedJob;
