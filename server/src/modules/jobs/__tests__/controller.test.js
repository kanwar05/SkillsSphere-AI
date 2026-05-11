import { jest } from "@jest/globals";
import * as jobController from "../controller.js";
import * as jobService from "../service.js";

// Mock the service layer so we only test controller logic
jest.mock("../service.js");

describe("Job Controller", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { _id: "user123" }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("createJobPosting", () => {
    it("should respond with 201 and created job", async () => {
      req.body = { title: "Test Job", skills: ["JS"] };
      
      const mockCreatedJob = { _id: "job123", ...req.body, recruiter: req.user._id };
      jobService.createJob.mockResolvedValue(mockCreatedJob);

      await jobController.createJobPosting(req, res, next);

      expect(jobService.createJob).toHaveBeenCalledWith(req.body, req.user._id);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        job: mockCreatedJob
      });
    });

    it("should pass errors to next()", async () => {
      const error = new Error("Database error");
      jobService.createJob.mockRejectedValue(error);

      await jobController.createJobPosting(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
