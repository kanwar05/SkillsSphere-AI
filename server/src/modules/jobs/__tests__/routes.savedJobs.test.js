import assert from "node:assert/strict";
import test from "node:test";
import jobsRoutes from "../routes.js";

const findRoute = (path, method) => {
  const layer = jobsRoutes.stack.find((stackLayer) => (
    stackLayer.route?.path === path &&
    stackLayer.route?.methods?.[method]
  ));

  assert.ok(layer, `${method.toUpperCase()} ${path} should be registered`);
  return layer.route.stack;
};

const invokeMiddleware = (middleware, req) =>
  new Promise((resolve) => {
    middleware.handle(req, {}, (error) => resolve(error));
  });

test("saved jobs APIs are registered with student authorization", async () => {
  const routes = [
    ["/saved", "get"],
    ["/:id/save", "post"],
    ["/:id/save", "delete"],
  ];

  for (const [path, method] of routes) {
    const [roleGuard] = findRoute(path, method);

    const studentError = await invokeMiddleware(roleGuard, {
      user: { role: "student" },
    });
    assert.equal(studentError, undefined);

    const recruiterError = await invokeMiddleware(roleGuard, {
      user: { role: "recruiter" },
    });
    assert.equal(recruiterError.statusCode, 403);
  }
});
