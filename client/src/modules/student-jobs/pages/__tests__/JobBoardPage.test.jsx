import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import JobBoardPage from "../JobBoardPage";
import { ToastProvider } from "../../../../shared/components/toast/ToastProvider";
import {
  getJobs,
  getMyAppliedJobIds,
  getSavedJobs,
  saveJob,
  unsaveJob,
} from "../../services/jobService";

vi.mock("../../services/jobService", () => ({
  applyToJob: vi.fn(),
  getJobs: vi.fn(),
  getMyAppliedJobIds: vi.fn(),
  getSavedJobs: vi.fn(),
  saveJob: vi.fn(),
  unsaveJob: vi.fn(),
}));

vi.mock("../../components/JobFilters", () => ({
  default: () => <aside>Job filters</aside>,
}));

vi.mock("../../components/JobCardSkeleton", () => ({
  default: () => <div>Loading job</div>,
}));

vi.mock("../../../../shared/components/Navbar", () => ({
  default: () => <nav />,
}));

vi.mock("../../../../shared/components/Footer", () => ({
  default: () => <footer />,
}));

vi.mock("../../../../hooks/useDocumentTitle", () => ({
  useDocumentTitle: vi.fn(),
}));

vi.mock("../../../../shared/components", async () => {
  const actual = await vi.importActual("../../../../shared/components");
  return {
    ...actual,
    JobViewerCard: ({ job, isSaved, isSaving, onToggleSave }) => (
      <article>
        <span>{job.title}</span>
        <button
          type="button"
          disabled={isSaving}
          aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
          onClick={() => onToggleSave(job)}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      </article>
    ),
    Pagination: () => null,
  };
});

const job = {
  _id: "507f1f77bcf86cd799439011",
  title: "Backend Engineer",
};

const renderPage = () => {
  const store = configureStore({
    reducer: {
      auth: () => ({
        token: "student-token",
        user: { _id: "student-1", role: "student" },
      }),
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ToastProvider>
          <JobBoardPage />
        </ToastProvider>
      </MemoryRouter>
    </Provider>,
  );
};

describe("JobBoardPage saved jobs", () => {
  beforeEach(() => {
    getJobs.mockResolvedValue({
      jobs: [job],
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
    });
    getMyAppliedJobIds.mockResolvedValue({ appliedJobIds: [] });
    getSavedJobs.mockResolvedValue({
      jobs: [],
      savedJobIds: [],
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
    });
    saveJob.mockResolvedValue({ saved: true });
    unsaveJob.mockResolvedValue({ saved: false });
  });

  it("saves and unsaves a job while keeping card state in sync", async () => {
    renderPage();

    const saveButton = await screen.findByRole("button", { name: "Save job" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveJob).toHaveBeenCalledWith(job._id, "student-token");
    });
    expect(await screen.findByRole("button", { name: "Remove from saved jobs" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove from saved jobs" }));

    await waitFor(() => {
      expect(unsaveJob).toHaveBeenCalledWith(job._id, "student-token");
    });
    expect(await screen.findByRole("button", { name: "Save job" })).toBeInTheDocument();
  });

  it("lists saved jobs in the Saved view", async () => {
    getSavedJobs.mockResolvedValue({
      jobs: [job],
      savedJobIds: [job._id],
      currentPage: 1,
      totalPages: 1,
      totalCount: 1,
    });

    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Saved" }));

    await waitFor(() => {
      expect(getSavedJobs).toHaveBeenCalledWith("student-token", 1, 6);
    });
    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove from saved jobs" })).toBeInTheDocument();
  });
});
