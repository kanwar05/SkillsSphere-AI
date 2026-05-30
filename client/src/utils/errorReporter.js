import { API_URL } from "../config/env";
import logger from "./logger";

const REDACTION_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /token["':=\s]+[A-Za-z0-9._~+/=-]+/gi,
  /password["':=\s]+[^,\s}]+/gi,
  /api[_-]?key["':=\s]+[A-Za-z0-9._~+/=-]+/gi,
];

const redactSensitiveData = (value) => {
  if (!value) return "";

  return REDACTION_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[redacted]"),
    String(value),
  );
};

const getCurrentRoute = () => {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

const getBrowserInfo = () => {
  if (typeof navigator === "undefined") return {};

  return {
    language: navigator.language,
    userAgent: redactSensitiveData(navigator.userAgent),
  };
};

const buildErrorPayload = (error, errorInfo = {}) => ({
  message: redactSensitiveData(error?.message || "Unknown client error"),
  stack: redactSensitiveData(error?.stack),
  componentStack: redactSensitiveData(errorInfo?.componentStack),
  route: redactSensitiveData(getCurrentRoute()),
  timestamp: new Date().toISOString(),
  browser: getBrowserInfo(),
});

const reportToBackend = async (payload) => {
  const endpoint = `${API_URL}/api/errors`;

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });
};

const reportToSentry = (error, payload) => {
  if (!import.meta.env.VITE_SENTRY_DSN || typeof window === "undefined") return;

  const sentry = window.Sentry;
  if (!sentry?.captureException) return;

  sentry.captureException(error, {
    extra: {
      componentStack: payload.componentStack,
      route: payload.route,
      timestamp: payload.timestamp,
    },
  });
};

export const reportError = async (error, errorInfo = {}) => {
  const payload = buildErrorPayload(error, errorInfo);

  logger.error("Unhandled React rendering error:", error, errorInfo);

  try {
    reportToSentry(error, payload);
  } catch (sentryError) {
    logger.warn("Sentry error reporting failed:", sentryError);
  }

  try {
    await reportToBackend(payload);
    return { success: true, payload };
  } catch (reportingError) {
    logger.warn("Backend error reporting failed:", reportingError);
    return { success: false, payload, error: reportingError };
  }
};

export const __testing = {
  buildErrorPayload,
  redactSensitiveData,
};
