import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import Resume from "../../../database/models/Resume.js";
import jobsRoutes from "../routes.js";

afterEach(() => {
  mock.restoreAll();
});

const getRecommendationsRoute = () => {
  const layer = jobsRoutes.stack.find((stackLayer) => (
    stackLayer.route?.path === "/recommendations" &&
    stackLayer.route?.methods?.get
  ));

  assert.ok(layer, "recommendations route should be registered");
  return layer.route.stack;
};

const invokeMiddleware = (middleware, req = {}) =>
  new Promise((resolve) => {
    middleware.handle(req, {}, (error) => {
      resolve(error);
    });
  });

test("recommendations route allows authenticated students through role guard", async () => {
  const [roleGuard, controller] = getRecommendationsRoute();
  mock.method(Resume, "findOne", () => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () => null,
  }));

  const error = await invokeMiddleware(roleGuard, {
    user: { role: "student" },
  });

  assert.equal(error, undefined);

  const response = await new Promise((resolve, reject) => {
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode: this.statusCode, data });
      },
    };

    controller.handle(
      {
        query: {},
        user: { _id: "student-123", role: "student" },
      },
      res,
      reject,
    );
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.data.success, true);
  assert.equal(response.data.hasResume, false);
});

test("recommendations route denies authenticated non-student roles", async () => {
  const [roleGuard] = getRecommendationsRoute();

  for (const role of ["recruiter", "admin", "tutor"]) {
    const error = await invokeMiddleware(roleGuard, {
      user: { role },
    });

    assert.equal(error.statusCode, 403);
    assert.match(error.message, /do not have permission/i);
  }
});

test("recommendations route denies unauthenticated requests at jobs router protect middleware", async () => {
  const protectLayer = jobsRoutes.stack[0];

  const error = await invokeMiddleware(protectLayer, {
    headers: {},
  });

  assert.equal(error.statusCode, 401);
  assert.match(error.message, /not logged in/i);
});
