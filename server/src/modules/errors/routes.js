import express from "express";

import logger from "../../utils/logger.js";

const router = express.Router();

const MAX_REPORT_BYTES = 16 * 1024;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_STACK_LENGTH = 8000;
const MAX_CONTEXT_BYTES = 4096;
const MAX_CONTEXT_DEPTH = 5;
const MAX_ARRAY_LENGTH = 25;
const REDACTED = "[redacted]";
const rateLimitBuckets = new Map();

const SENSITIVE_KEY_PATTERN =
  /(?:password|passcode|token|access[_-]?token|refresh[_-]?token|jwt|api[_-]?key|authorization|cookie|session[_-]?id|secret)/i;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const SENSITIVE_VALUE_PATTERNS = [
  /(password|access[_-]?token|refresh[_-]?token|token|jwt|api[_-]?key|authorization|cookie|session[_-]?id|secret)(["':=\s]+)[^,\s}]+/gi,
  /(?:^|;\s*)(sessionid|sid|jwt|token)=([^;]+)/gi,
];

const isPlainObject = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  Object.getPrototypeOf(value) === Object.prototype;

const getJsonSize = (value) => Buffer.byteLength(JSON.stringify(value), "utf8");

export const resetClientErrorRateLimit = () => {
  rateLimitBuckets.clear();
};

const redactString = (value) => {
  let safe = String(value)
    .replace(JWT_PATTERN, REDACTED)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`);

  for (const pattern of SENSITIVE_VALUE_PATTERNS) {
    safe = safe.replace(pattern, (match, key, separator) =>
      separator ? `${key}${separator}${REDACTED}` : match.replace(/=.*/, `=${REDACTED}`),
    );
  }

  return safe;
};

export const sanitizeClientErrorValue = (value, depth = 0) => {
  if (depth > MAX_CONTEXT_DEPTH) return "[max-depth]";
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) => sanitizeClientErrorValue(item, depth + 1));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? REDACTED
          : sanitizeClientErrorValue(nestedValue, depth + 1),
      ]),
    );
  }

  return "[unsupported]";
};

const createValidationError = (message) => ({
  success: false,
  message,
});

router.use(express.json({ limit: `${MAX_REPORT_BYTES}b`, strict: true }));

router.use((error, req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Error report payload is too large",
    });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
    });
  }

  return next(error);
});

const isValidStackTrace = (stack) => {
  if (stack === undefined) return true;
  if (typeof stack !== "string") return false;
  if (stack.length > MAX_STACK_LENGTH) return false;
  if (stack.includes("\0")) return false;

  const lines = stack.split("\n");
  if (lines.length > 100) return false;

  return lines.every((line) => line.length <= 500);
};

const validateNestedValue = (value, depth = 0) => {
  if (depth > MAX_CONTEXT_DEPTH) return false;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return (
      value.length <= MAX_ARRAY_LENGTH &&
      value.every((item) => validateNestedValue(item, depth + 1))
    );
  }
  if (isPlainObject(value)) {
    return Object.values(value).every((nestedValue) =>
      validateNestedValue(nestedValue, depth + 1),
    );
  }

  return false;
};

const validateClientErrorReport = (payload) => {
  if (!isPlainObject(payload)) {
    return "Invalid error report payload";
  }

  const allowedKeys = new Set([
    "message",
    "stack",
    "componentStack",
    "context",
    "route",
    "timestamp",
    "browser",
  ]);
  if (Object.keys(payload).some((key) => !allowedKeys.has(key))) {
    return "Invalid error report payload";
  }

  if (typeof payload.message !== "string" || !payload.message.trim()) {
    return "Error message is required";
  }
  if (payload.message.length > MAX_MESSAGE_LENGTH) {
    return "Error message is too large";
  }

  if (!isValidStackTrace(payload.stack) || !isValidStackTrace(payload.componentStack)) {
    return "Invalid stack trace";
  }

  if (payload.route !== undefined && typeof payload.route !== "string") {
    return "Invalid error report payload";
  }
  if (payload.route?.length > 2048) {
    return "Invalid error report payload";
  }

  if (payload.timestamp !== undefined) {
    if (typeof payload.timestamp !== "string" || Number.isNaN(Date.parse(payload.timestamp))) {
      return "Invalid error report payload";
    }
  }

  for (const key of ["context", "browser"]) {
    if (payload[key] !== undefined && !isPlainObject(payload[key])) {
      return "Invalid error report payload";
    }
    if (payload[key] !== undefined && !validateNestedValue(payload[key])) {
      return "Invalid error report payload";
    }
    if (payload[key] !== undefined && getJsonSize(payload[key]) > MAX_CONTEXT_BYTES) {
      return "Error report metadata is too large";
    }
  }

  if (getJsonSize(payload) > MAX_REPORT_BYTES) {
    return "Error report payload is too large";
  }

  return null;
};

export const sanitizeClientErrorReport = (payload) => ({
  message: sanitizeClientErrorValue(payload.message),
  stack: payload.stack ? sanitizeClientErrorValue(payload.stack) : undefined,
  componentStack: payload.componentStack
    ? sanitizeClientErrorValue(payload.componentStack)
    : undefined,
  context: payload.context ? sanitizeClientErrorValue(payload.context) : undefined,
  route: payload.route ? sanitizeClientErrorValue(payload.route) : undefined,
  timestamp: payload.timestamp,
  browser: payload.browser ? sanitizeClientErrorValue(payload.browser) : undefined,
});

const clientErrorLimiter = (req, res, next) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = Number.parseInt(process.env.CLIENT_ERROR_REPORT_LIMIT_MAX || "30", 10);
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return res.status(429).json({
      success: false,
      message: "Too many error reports. Please try again later.",
    });
  }

  return next();
};

router.post("/", clientErrorLimiter, (req, res) => {
  const validationError = validateClientErrorReport(req.body);
  if (validationError) {
    return res.status(400).json(createValidationError(validationError));
  }

  const safeReport = sanitizeClientErrorReport(req.body);

  if (process.env.NODE_ENV !== "production") {
    logger.warn("[client-error]", safeReport);
  }

  return res.status(204).end();
});

export default router;
