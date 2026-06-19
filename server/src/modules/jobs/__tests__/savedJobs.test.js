import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import JobPosting from "../../../database/models/JobPosting.js";
import SavedJob from "../../../database/models/SavedJob.js";
import {
  getSavedJobsForStudent,
  saveJobForStudent,
  unsaveJobForStudent,
} from "../service.js";

const jobId = "507f1f77bcf86cd799439011";
const studentId = "507f1f77bcf86cd799439012";

describe("saved jobs service", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("saves an open job idempotently for a student", async () => {
    mock.method(JobPosting, "findOne", (query) => ({
      select: async () => ({ _id: query._id }),
    }));
    mock.method(SavedJob, "findOneAndUpdate", async () => ({
      student: studentId,
      job: jobId,
    }));

    const result = await saveJobForStudent(jobId, studentId);

    assert.equal(result, jobId);
    assert.deepEqual(JobPosting.findOne.mock.calls[0].arguments[0], {
      _id: jobId,
      status: "open",
    });
    assert.deepEqual(SavedJob.findOneAndUpdate.mock.calls[0].arguments, [
      { student: studentId, job: jobId },
      { $setOnInsert: { student: studentId, job: jobId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ]);
  });

  it("unsaves a job idempotently", async () => {
    mock.method(SavedJob, "deleteOne", async () => ({ deletedCount: 0 }));

    const result = await unsaveJobForStudent(jobId, studentId);

    assert.equal(result, jobId);
    assert.deepEqual(SavedJob.deleteOne.mock.calls[0].arguments[0], {
      student: studentId,
      job: jobId,
    });
  });

  it("lists paginated saved jobs and all saved IDs", async () => {
    let findCall = 0;
    mock.method(SavedJob, "find", () => {
      findCall += 1;

      if (findCall === 1) {
        const query = {
          populate() { return query; },
          sort() { return query; },
          skip() { return query; },
          limit() { return query; },
          async lean() {
            return [
              {
                createdAt: new Date("2026-06-19T10:00:00.000Z"),
                job: { _id: jobId, title: "Backend Engineer" },
              },
            ];
          },
        };
        return query;
      }

      return {
        async distinct() {
          return [
            { toString: () => jobId },
            { toString: () => "507f1f77bcf86cd799439013" },
          ];
        },
      };
    });
    mock.method(SavedJob, "countDocuments", async () => 2);

    const result = await getSavedJobsForStudent(studentId, { page: 1, limit: 1 });

    assert.equal(result.jobs.length, 1);
    assert.equal(result.jobs[0]._id, jobId);
    assert.equal(result.jobs[0].savedAt.toISOString(), "2026-06-19T10:00:00.000Z");
    assert.deepEqual(result.savedJobIds, [
      jobId,
      "507f1f77bcf86cd799439013",
    ]);
    assert.equal(result.totalCount, 2);
    assert.equal(result.totalPages, 2);
    assert.equal(result.currentPage, 1);
  });
});
