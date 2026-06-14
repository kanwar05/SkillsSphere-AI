import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import mongoose from "mongoose";
import User from "../../../database/models/User.js";
import { updateProfile } from "../controller.js";

afterEach(() => {
  mock.restoreAll();
});

const invokeUpdateProfile = async ({ body, role = "recruiter" }) => {
  const userId = new mongoose.Types.ObjectId();
  let updatePayload;

  mock.method(User, "findByIdAndUpdate", (_id, update) => {
    updatePayload = update;

    return {
      select: async () => ({
        _id,
        role,
        accessLevel: "pending",
        name: update.$set?.name,
        companyWebsite: update.$set?.companyWebsite,
        ...update.$set,
      }),
    };
  });

  const req = {
    body,
    user: { _id: userId, role },
  };

  const result = await new Promise((resolve, reject) => {
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode: this.statusCode, data, updatePayload });
      },
    };

    updateProfile(req, res, reject);
  });

  return result;
};

test("updateProfile stores bare company website domains with https prefix", async () => {
  const { statusCode, data, updatePayload } = await invokeUpdateProfile({
    body: {
      name: "Recruiter User",
      companyWebsite: "example.com",
    },
  });

  assert.equal(statusCode, 200);
  assert.equal(data.success, true);
  assert.equal(updatePayload.$set.companyWebsite, "https://example.com");
});

test("updateProfile stores www company website domains with https prefix", async () => {
  const { statusCode, updatePayload } = await invokeUpdateProfile({
    body: {
      name: "Recruiter User",
      companyWebsite: "www.example.com",
    },
  });

  assert.equal(statusCode, 200);
  assert.equal(updatePayload.$set.companyWebsite, "https://www.example.com");
});

test("updateProfile keeps full https company website URLs unchanged", async () => {
  const { statusCode, updatePayload } = await invokeUpdateProfile({
    body: {
      name: "Recruiter User",
      companyWebsite: "https://example.com",
    },
  });

  assert.equal(statusCode, 200);
  assert.equal(updatePayload.$set.companyWebsite, "https://example.com");
});
