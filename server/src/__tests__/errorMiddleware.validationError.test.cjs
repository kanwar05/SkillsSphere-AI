const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const globalErrorHandlerModule = require("../middleware/errorMiddleware.js");
const globalErrorHandler = globalErrorHandlerModule.default || globalErrorHandlerModule;

describe("errorMiddleware ValidationError handling", () => {
  const makeRes = () => {
    const res = {
      statusCode: null,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    return res;
  };

  const next = () => {};

  test("does not crash when ValidationError has missing err.errors", () => {
    process.env.NODE_ENV = "production";

    const err = new Error("Validation failed");
    err.isOperational = true;
    err.statusCode = 400;
    err.status = "error";
    err.name = "ValidationError";
    err.errors = undefined;

    const req = { method: "POST", originalUrl: "/api/test" };
    const res = makeRes();

    assert.doesNotThrow(() => globalErrorHandler(err, req, res, next));
    assert.equal(res.statusCode, 400);
    assert.ok(res.payload);
    assert.match(res.payload.message, /Invalid input data/i);

  });

  test("preserves isOperational = false from the original error", () => {
    process.env.NODE_ENV = "production";

    const err = new Error("Cast failed");
    err.name = "CastError";
    err.path = "id";
    err.value = "123";
    err.isOperational = false;

    const req = { method: "POST", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    // If it correctly preserved isOperational = false, it should return 500
    assert.equal(res.statusCode, 500);
    assert.equal(res.payload.message, "Something went very wrong!");
  });

  test("preserves err.statusCode and err.status when error has no status/statusCode", () => {
    process.env.NODE_ENV = "production";

    const err = new Error("Custom backend error");
    err.statusCode = 403;
    err.status = "fail";
    err.isOperational = true;

    const req = { method: "POST", originalUrl: "/api/test" };
    const res = makeRes();

    globalErrorHandler(err, req, res, next);

    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.status, "fail");
    assert.equal(res.payload.statusCode, 403);
    assert.equal(res.payload.message, "Custom backend error");
  });
});

