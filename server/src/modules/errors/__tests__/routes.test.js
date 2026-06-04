import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import errorReportRoutes, {
  resetClientErrorRateLimit,
  sanitizeClientErrorReport,
} from "../routes.js";
import logger from "../../../utils/logger.js";

const nativeFetch = globalThis.fetch.bind(globalThis);

const validReport = (overrides = {}) => ({
  message: "Client render failed",
  stack: "Error: Client render failed\n    at Component.jsx:10:5",
  componentStack: "Component\n    at Widget",
  context: {
    feature: "dashboard",
    retryCount: 1,
  },
  route: "/dashboard",
  timestamp: "2026-06-04T12:00:00.000Z",
  browser: {
    language: "en-US",
    userAgent: "Mozilla/5.0",
  },
  ...overrides,
});

const createTestServer = () => {
  const app = express();

  app.use("/api/errors", errorReportRoutes);

  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
};

const postReport = ({ baseUrl, body, rawBody, headers = {} }) =>
  nativeFetch(`${baseUrl}/api/errors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: rawBody ?? JSON.stringify(body),
  });

const parseBody = async (response) => {
  if (response.status === 204) return null;
  return response.json();
};

describe("client error report route security", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "development";
    process.env.CLIENT_ERROR_REPORT_LIMIT_MAX = "100";
    resetClientErrorRateLimit();
  });

  afterEach(() => {
    mock.restoreAll();
    resetClientErrorRateLimit();
    delete process.env.CLIENT_ERROR_REPORT_LIMIT_MAX;
  });

  it("accepts a valid client error report and logs sanitized debugging fields", async () => {
    const warnMock = mock.method(logger, "warn", () => {});
    const server = await createTestServer();

    try {
      const response = await postReport({
        baseUrl: server.baseUrl,
        body: validReport(),
      });

      assert.equal(response.status, 204);
      assert.equal(warnMock.mock.calls.length, 1);
      assert.equal(warnMock.mock.calls[0].arguments[0], "[client-error]");
      assert.deepEqual(warnMock.mock.calls[0].arguments[1].context, {
        feature: "dashboard",
        retryCount: 1,
      });
    } finally {
      await server.close();
    }
  });

  it("redacts sensitive fields and values before logging", async () => {
    const warnMock = mock.method(logger, "warn", () => {});
    const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturesecret";
    const server = await createTestServer();

    try {
      const response = await postReport({
        baseUrl: server.baseUrl,
        body: validReport({
          message: `Failed with password=hunter2 and Bearer ${jwt}`,
          stack: `Error: token=${jwt}`,
          context: {
            password: "secret-password",
            accessToken: "secret-access-token",
            refresh_token: "secret-refresh-token",
            jwt,
            apiKey: "secret-api-key",
            authorization: `Bearer ${jwt}`,
            cookie: "sid=secret-session; theme=light",
            sessionId: "session-secret",
            nested: {
              headers: {
                Authorization: `Bearer ${jwt}`,
                Cookie: "sessionid=secret-cookie",
              },
              safe: "still useful",
            },
          },
          browser: {
            userAgent: `Mozilla token=${jwt}`,
            language: "en-US",
          },
        }),
      });

      assert.equal(response.status, 204);
      const loggedPayload = warnMock.mock.calls[0].arguments[1];
      const serialized = JSON.stringify(loggedPayload);

      for (const secret of [
        "hunter2",
        jwt,
        "secret-password",
        "secret-access-token",
        "secret-refresh-token",
        "secret-api-key",
        "secret-session",
        "secret-cookie",
      ]) {
        assert.equal(serialized.includes(secret), false, `leaked ${secret}`);
      }

      assert.equal(loggedPayload.context.password, "[redacted]");
      assert.equal(loggedPayload.context.accessToken, "[redacted]");
      assert.equal(loggedPayload.context.nested.headers.Authorization, "[redacted]");
      assert.equal(loggedPayload.context.nested.safe, "still useful");
      assert.match(serialized, /\[redacted\]/);
    } finally {
      await server.close();
    }
  });

  it("rejects invalid payload structures with safe validation errors", async () => {
    const warnMock = mock.method(logger, "warn", () => {});
    const invalidPayloads = [
      null,
      [],
      "not an object",
      {},
      { message: "" },
      validReport({ unexpected: true }),
      validReport({ stack: ["not", "a", "string"] }),
      validReport({ stack: "bad\0stack" }),
      validReport({ context: ["not", "an", "object"] }),
      validReport({ browser: "not an object" }),
      validReport({ timestamp: "not-a-date" }),
    ];
    const server = await createTestServer();

    try {
      for (const body of invalidPayloads) {
        const response = await postReport({ baseUrl: server.baseUrl, body });
        const payload = await parseBody(response);

        assert.equal(response.status, 400);
        assert.equal(payload.success, false);
        assert.match(payload.message, /invalid|required|stack/i);
      }

      assert.equal(warnMock.mock.calls.length, 0);
    } finally {
      await server.close();
    }
  });

  it("rejects oversized payloads, metadata, stack traces, nesting, and arrays", async () => {
    const warnMock = mock.method(logger, "warn", () => {});
    const tooDeep = { a: { b: { c: { d: { e: { f: "too deep" } } } } } };
    const oversizedCases = [
      validReport({ message: "x".repeat(1001) }),
      validReport({ stack: "x".repeat(8001) }),
      validReport({ context: { blob: "x".repeat(4097) } }),
      validReport({ context: tooDeep }),
      validReport({ context: { list: Array.from({ length: 26 }, (_, index) => index) } }),
    ];
    const server = await createTestServer();

    try {
      for (const body of oversizedCases) {
        const response = await postReport({ baseUrl: server.baseUrl, body });
        const payload = await parseBody(response);

        assert.equal(response.status, 400);
        assert.equal(payload.success, false);
        assert.match(payload.message, /large|invalid/i);
      }

      const rawOversizedResponse = await postReport({
        baseUrl: server.baseUrl,
        rawBody: JSON.stringify(validReport({ context: { blob: "x".repeat(20 * 1024) } })),
      });
      const rawOversized = await parseBody(rawOversizedResponse);

      assert.equal(rawOversizedResponse.status, 413);
      assert.equal(rawOversized.success, false);
      assert.equal(rawOversized.message, "Error report payload is too large");
      assert.equal(warnMock.mock.calls.length, 0);
    } finally {
      await server.close();
    }
  });

  it("rate-limits repeated reports with a consistent safe response", async () => {
    process.env.CLIENT_ERROR_REPORT_LIMIT_MAX = "2";
    const warnMock = mock.method(logger, "warn", () => {});
    const server = await createTestServer();

    try {
      const first = await postReport({ baseUrl: server.baseUrl, body: validReport({ message: "first" }) });
      const second = await postReport({ baseUrl: server.baseUrl, body: validReport({ message: "second" }) });
      const third = await postReport({ baseUrl: server.baseUrl, body: validReport({ message: "third" }) });
      const thirdPayload = await parseBody(third);

      assert.equal(first.status, 204);
      assert.equal(second.status, 204);
      assert.equal(third.status, 429);
      assert.deepEqual(thirdPayload, {
        success: false,
        message: "Too many error reports. Please try again later.",
      });
      assert.equal(JSON.stringify(thirdPayload).includes("rateLimitBuckets"), false);
      assert.equal(warnMock.mock.calls.length, 2);
    } finally {
      await server.close();
    }
  });
});

describe("client error report sanitization helper", () => {
  it("redacts nested sensitive data without removing safe metadata", () => {
    const sanitized = sanitizeClientErrorReport(
      validReport({
        context: {
          safe: "value",
          nested: {
            refreshToken: "refresh-secret",
            session_id: "session-secret",
          },
        },
      }),
    );

    assert.equal(sanitized.context.safe, "value");
    assert.equal(sanitized.context.nested.refreshToken, "[redacted]");
    assert.equal(sanitized.context.nested.session_id, "[redacted]");
  });
});
