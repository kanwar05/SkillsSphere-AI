import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import mongoose from "mongoose";
import User from "../../../database/models/User.js";
import { getPreferences, updatePreferences } from "../controller.js";
import userRoutes from "../routes.js";

afterEach(() => {
  mock.restoreAll();
});

const waitForController = (controller, { body, userDoc }) => {
  const req = {
    body,
    user: { _id: new mongoose.Types.ObjectId() },
  };

  let responseData;
  let responseStatus;

  const responsePromise = new Promise((resolve, reject) => {
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        resolve();
      },
    };

    const next = (error) => {
      if (error) {
        resolve(error);
      } else {
        reject(new Error("next called without error"));
      }
    };

    mock.method(User, "findById", () => ({
      select: async () => userDoc,
    }));

    controller(req, res, next);
  });

  return responsePromise.then((error) => {
    if (error instanceof Error) return { error };
    return { responseData, responseStatus, userDoc };
  });
};

test("getPreferences - returns defaults when preferences are missing", async () => {
  const { responseData, responseStatus } = await waitForController(getPreferences, {
    userDoc: { preferences: undefined },
  });

  assert.equal(responseStatus, 200);
  assert.equal(responseData.preferences.emailFrequency, "weekly");
  assert.equal(responseData.preferences.notifications.emailNotifications, true);
  assert.equal(responseData.preferences.notifications.inAppNotifications, true);
  assert.equal(responseData.preferences.notifications.jobUpdates, true);
  assert.equal(responseData.preferences.notifications.resumeAnalysis, true);
  assert.equal(responseData.preferences.notifications.systemAlerts, true);
  assert.equal(responseData.preferences.privacy.profileVisibility, "recruiters");
});

test("getPreferences - returns saved preferences merged with safe defaults", async () => {
  const { responseData } = await waitForController(getPreferences, {
    userDoc: {
      preferences: {
        notifications: { jobUpdates: false, inAppNotifications: false },
        emailFrequency: "daily",
        privacy: { profileVisibility: "private" },
      },
    },
  });

  assert.equal(responseData.preferences.emailFrequency, "daily");
  assert.equal(responseData.preferences.notifications.jobUpdates, false);
  assert.equal(responseData.preferences.notifications.inAppNotifications, false);
  assert.equal(responseData.preferences.notifications.interviewReminders, true);
  assert.equal(responseData.preferences.privacy.profileVisibility, "private");
});

test("getPreferences - migrates legacy notification keys into current settings", async () => {
  const { responseData } = await waitForController(getPreferences, {
    userDoc: {
      preferences: {
        notifications: { jobAlerts: false, platformUpdates: false },
      },
    },
  });

  assert.equal(responseData.preferences.notifications.jobUpdates, false);
  assert.equal(responseData.preferences.notifications.systemAlerts, false);
  assert.equal(responseData.preferences.notifications.jobAlerts, undefined);
  assert.equal(responseData.preferences.notifications.platformUpdates, undefined);
});

test("updatePreferences - updates valid preferences", async () => {
  const userDoc = {
    preferences: undefined,
    save: mock.fn(async () => {}),
  };

  const { responseData, responseStatus } = await waitForController(updatePreferences, {
    userDoc,
    body: {
      notifications: {
        emailNotifications: false,
        inAppNotifications: false,
        interviewReminders: true,
        jobUpdates: false,
        resumeAnalysis: false,
        systemAlerts: true,
      },
      emailFrequency: "instant",
      privacy: {
        profileVisibility: "public",
        showInterviewHistory: true,
      },
    },
  });

  assert.equal(responseStatus, 200);
  assert.equal(responseData.preferences.emailFrequency, "instant");
  assert.equal(responseData.preferences.notifications.emailNotifications, false);
  assert.equal(responseData.preferences.notifications.inAppNotifications, false);
  assert.equal(responseData.preferences.notifications.jobUpdates, false);
  assert.equal(responseData.preferences.notifications.resumeAnalysis, false);
  assert.equal(responseData.preferences.notifications.systemAlerts, true);
  assert.equal(responseData.preferences.privacy.profileVisibility, "public");
  assert.equal(responseData.preferences.privacy.showInterviewHistory, true);
  assert.equal(userDoc.save.mock.callCount(), 1);
});

test("updatePreferences - rejects invalid email frequency", async () => {
  const { error } = await waitForController(updatePreferences, {
    userDoc: { preferences: {}, save: mock.fn(async () => {}) },
    body: { emailFrequency: "hourly" },
  });

  assert.equal(error.statusCode, 400);
  assert.match(error.message, /invalid email frequency/i);
});

test("updatePreferences - rejects invalid profile visibility", async () => {
  const { error } = await waitForController(updatePreferences, {
    userDoc: { preferences: {}, save: mock.fn(async () => {}) },
    body: { privacy: { profileVisibility: "everyone" } },
  });

  assert.equal(error.statusCode, 400);
  assert.match(error.message, /invalid profile visibility/i);
});

test("updatePreferences - rejects unknown fields", async () => {
  const { error } = await waitForController(updatePreferences, {
    userDoc: { preferences: {}, save: mock.fn(async () => {}) },
    body: { notifications: { jobUpdates: true, smsNotifications: true } },
  });

  assert.equal(error.statusCode, 400);
  assert.match(error.message, /unknown notification preference field/i);
});

test("user preference routes reject unauthorized requests", async () => {
  const firstLayer = userRoutes.stack[0];
  const req = { headers: {} };

  const error = await new Promise((resolve) => {
    firstLayer.handle(req, {}, resolve);
  });

  assert.equal(error.statusCode, 401);
  assert.match(error.message, /not logged in/i);
});
