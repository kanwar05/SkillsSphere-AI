import React, { useState } from "react";
import PropTypes from "prop-types";
import Input from "../../../shared/components/Input";
import Select from "../../../shared/components/Select";
import Button from "../../../shared/components/Button";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
];

// Matches schema enum exactly
const JOB_LEVEL_OPTIONS = [
  { value: "Internship", label: "Internship" },
  { value: "Entry Level", label: "Entry Level" },
  { value: "Associate", label: "Associate" },
  { value: "Mid-Senior Level", label: "Mid-Senior Level" },
  { value: "Director", label: "Director" },
  { value: "Executive", label: "Executive" },
];

// Matches schema's set() transform: trim + lowercase
const stringToArray = (str) =>
  str ? str.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

// For pre-populating textareas from existing array data (edit mode)
const arrayToString = (arr) =>
  Array.isArray(arr) ? arr.join(", ") : arr || "";

const JobPostingForm = ({ onSubmit, initialData = {}, isLoading = false, fieldErrors = {} }) => {
  const [formData, setFormData] = useState({
    title: initialData.title || "",
    description: initialData.description || "",
    skills: arrayToString(initialData.skills),
    requirements: arrayToString(initialData.requirements),
    responsibilities: arrayToString(initialData.responsibilities),
    keywords: arrayToString(initialData.keywords),
    experienceRequired: initialData.experienceRequired ?? 0,
    jobLevel: initialData.jobLevel || "Entry Level",
    status: initialData.status || "draft",
    location: {
      city: initialData.location?.city || "",
      state: initialData.location?.state || "",
      country: initialData.location?.country || "India",
      remote: initialData.location?.remote || false,
    },
    salary: {
      min: initialData.salary?.min || "",
      max: initialData.salary?.max || "",
      currency: initialData.salary?.currency || "INR",
      isNegotiable: initialData.salary?.isNegotiable || false,
    },
  });

  const [errors, setErrors] = useState({});

  // Merge local validation errors with backend field errors
  const allErrors = { ...errors, ...fieldErrors };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear error when user types
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleLocationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
    if (errors[`location.${field}`]) {
      setErrors((prev) => ({ ...prev, [`location.${field}`]: null }));
    }
  };

  const handleSalaryChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      salary: { ...prev.salary, [field]: value },
    }));
    if (errors[`salary.${field}`]) {
      setErrors((prev) => ({ ...prev, [`salary.${field}`]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Job title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (formData.description.trim().length < 20)
      newErrors.description = "Description must be at least 20 characters";
    if (!formData.skills.trim()) newErrors.skills = "At least one skill is required";

    // Required per schema
    if (formData.experienceRequired === "" || formData.experienceRequired === null || Number(formData.experienceRequired) < 0)
      newErrors.experienceRequired = "Years of experience is required";
    if (!formData.jobLevel) newErrors.jobLevel = "Job level is required";

    // Location
    if (!formData.location.city.trim()) newErrors["location.city"] = "City is required";
    if (!formData.location.state.trim()) newErrors["location.state"] = "State is required";
    if (!formData.location.country.trim()) newErrors["location.country"] = "Country is required";

    // Salary — always required per schema (min/max have no negotiable bypass in the model)
    if (formData.salary.min === "" || formData.salary.min === null)
      newErrors["salary.min"] = "Minimum salary is required";
    if (formData.salary.max === "" || formData.salary.max === null)
      newErrors["salary.max"] = "Maximum salary is required";
    if (
      formData.salary.min !== "" && formData.salary.max !== "" &&
      Number(formData.salary.min) > Number(formData.salary.max)
    ) {
      newErrors["salary.max"] = "Maximum salary must be greater than or equal to minimum";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate())  return; 
      // Explicit field mapping — only sends fields defined in the JobPosting schema
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      skills: stringToArray(formData.skills),
      requirements: stringToArray(formData.requirements),
      responsibilities: stringToArray(formData.responsibilities),
      keywords: stringToArray(formData.keywords),
      experienceRequired: Number(formData.experienceRequired),
      jobLevel: formData.jobLevel,
      status: formData.status,
      location: {
        city: formData.location.city.trim(),
        state: formData.location.state.trim(),
        country: formData.location.country.trim(),
        remote: formData.location.remote,
      },
      salary: {
        min: Number(formData.salary.min),
        max: Number(formData.salary.max),
        currency: formData.salary.currency,
        isNegotiable: formData.salary.isNegotiable,
      },
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          id="title"
          label="Job Title"
          placeholder="e.g. Senior Software Engineer"
          value={formData.title}
          onChange={handleChange}
          error={allErrors.title}
          required
        />
        <Select
          id="status"
          label="Status"
          options={STATUS_OPTIONS}
          value={formData.status}
          onChange={handleChange}
          error={allErrors.status}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          id="jobLevel"
          label="Job Level"
          options={JOB_LEVEL_OPTIONS}
          value={formData.jobLevel}
          onChange={handleChange}
          error={allErrors.jobLevel}
          required
        />
        <Input
          id="experienceRequired"
          label="Years of Experience Required"
          type="number"
          min="0"
          placeholder="e.g. 3"
          value={formData.experienceRequired}
          onChange={handleChange}
          error={allErrors.experienceRequired}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-gray-300">
          Job Description <span className="text-red-500">*</span>
        </label>
        <textarea
          data-testid="input-description"
          id="description"
          rows={5}
          className={`w-full rounded-lg border bg-slate-800 px-3.5 py-2.5 text-sm text-white caret-white placeholder:text-gray-500 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            allErrors.description
              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
              : "border-slate-600 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-500"
          }`}
          placeholder="Describe the role, responsibilities, and team..."
          value={formData.description}
          onChange={handleChange}
        />
        {allErrors.description && (
          <p data-testid="error-description" className="text-xs text-red-400 flex items-center gap-1 mt-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {allErrors.description}
          </p>
        )}
      </div>

      {/* skills */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="skills" className="text-sm font-medium text-gray-300">
          Required Skills <span className="text-red-500">*</span>
        </label>
        <textarea
          data-testid="input-skills"
          id="skills"
          rows={2}
          className={`w-full rounded-lg border bg-slate-800 px-3.5 py-2.5 text-sm text-white caret-white placeholder:text-gray-500 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-y ${
            allErrors.skills
              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
              : "border-slate-600 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-500"
          }`}
          placeholder="e.g. react, typescript, node.js, aws"
          value={formData.skills}
          onChange={handleChange}
        />
        <p className="text-xs text-slate-500">Comma-separated. Stored in lowercase — used to match candidates.</p>
        {allErrors.skills && <p data-testid="error-skills" className="text-xs text-red-400">{allErrors.skills}</p>}
      </div>

      {/* requirements */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="requirements" className="text-sm font-medium text-gray-300">Requirements</label>
        <textarea
          data-testid="input-requirements"
          id="requirements"
          rows={3}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3.5 py-2.5 text-sm text-white caret-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-500 resize-y"
          placeholder="e.g. 3+ years experience, B.Tech in CS, Strong DSA"
          value={formData.requirements}
          onChange={handleChange}
        />
        <p className="text-xs text-slate-500">Comma-separated list of candidate qualifications.</p>
      </div>

      {/* responsibilities */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="responsibilities" className="text-sm font-medium text-gray-300">Responsibilities</label>
        <textarea
          data-testid="input-responsibilities"
          id="responsibilities"
          rows={3}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3.5 py-2.5 text-sm text-white caret-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-500 resize-y"
          placeholder="e.g. Design microservices, Lead code reviews, Mentor juniors"
          value={formData.responsibilities}
          onChange={handleChange}
        />
        <p className="text-xs text-slate-500">Comma-separated list of key responsibilities.</p>
      </div>

      {/* keywords */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="keywords" className="text-sm font-medium text-gray-300">Keywords</label>
        <textarea
          data-testid="input-keywords"
          id="keywords"
          rows={2}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3.5 py-2.5 text-sm text-white caret-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-500 resize-y"
          placeholder="e.g. remote, fintech, startup, react"
          value={formData.keywords}
          onChange={handleChange}
        />
        <p className="text-xs text-slate-500">Comma-separated keywords to improve job discoverability.</p>
      </div>

      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="location.city"
            label="City"
            placeholder="e.g. Mumbai"
            value={formData.location.city}
            onChange={(e) => handleLocationChange("city", e.target.value)}
            error={allErrors["location.city"]}
            required
          />
          <Input
            id="location.state"
            label="State"
            placeholder="e.g. Maharashtra"
            value={formData.location.state}
            onChange={(e) => handleLocationChange("state", e.target.value)}
            error={allErrors["location.state"]}
            required
          />
          <Input
            id="location.country"
            label="Country"
            placeholder="e.g. India"
            value={formData.location.country}
            onChange={(e) => handleLocationChange("country", e.target.value)}
            error={allErrors["location.country"]}
            required
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="location.remote"
            checked={formData.location.remote}
            onChange={(e) => handleLocationChange("remote", e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="location.remote" className="text-sm text-gray-300">
            Remote position
          </label>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Salary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="salary.min"
            label="Minimum"
            type="number"
            placeholder="e.g. 500000"
            value={formData.salary.min}
            onChange={(e) => handleSalaryChange("min", e.target.value)}
            error={allErrors["salary.min"]}
            required
          />
          <Input
            id="salary.max"
            label="Maximum"
            type="number"
            placeholder="e.g. 1000000"
            value={formData.salary.max}
            onChange={(e) => handleSalaryChange("max", e.target.value)}
            error={allErrors["salary.max"]}
            required
          />
          <Select
            id="salary.currency"
            label="Currency"
            options={CURRENCY_OPTIONS}
            value={formData.salary.currency}
            onChange={(e) => handleSalaryChange("currency", e.target.value)}
            error={allErrors["salary.currency"]}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="salary.isNegotiable"
            checked={formData.salary.isNegotiable}
            onChange={(e) => handleSalaryChange("isNegotiable", e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="salary.isNegotiable" className="text-sm text-gray-300">
            Salary is negotiable
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          className="px-8 bg-blue-600 hover:bg-blue-500"
        >
          {(initialData._id || initialData.id) ? "Update Job Posting" : "Create Job Posting"}
        </Button>
      </div>
    </form>
  );
};

JobPostingForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isLoading: PropTypes.bool,
  fieldErrors: PropTypes.object,
};

export default JobPostingForm;
