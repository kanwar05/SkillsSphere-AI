import { z } from 'zod';

const hasValidDomainHostname = (hostname) => {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname.includes("..") ||
    !normalizedHostname.includes(".")
  ) {
    return false;
  }

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
    normalizedHostname,
  );
};

const isValidCompanyWebsite = (value) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return true;

  try {
    const parsedUrl = new URL(
      /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`,
    );

    return (
      ["http:", "https:"].includes(parsedUrl.protocol) &&
      hasValidDomainHostname(parsedUrl.hostname)
    );
  } catch {
    return false;
  }
};

const companyWebsiteSchema = z
  .string()
  .trim()
  .refine(isValidCompanyWebsite, "Invalid URL")
  .optional();

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  companyWebsite: companyWebsiteSchema,
  linkedinUrl: z.string().optional(),
  credentialUrl: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
});

export const updatePreferencesSchema = z.object({
  notifications: z.object({
    emailNotifications: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    interviewReminders: z.boolean().optional(),
    jobUpdates: z.boolean().optional(),
    resumeAnalysis: z.boolean().optional(),
    systemAlerts: z.boolean().optional(),
  }).optional(),
  emailFrequency: z.enum(['instant', 'daily', 'weekly', 'never']).optional(),
  privacy: z.record(z.any()).optional(),
});
