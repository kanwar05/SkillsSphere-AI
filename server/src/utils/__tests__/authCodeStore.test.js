import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateAuthCode, consumeAuthCode } from "../authCodeStore.js";

describe("authCodeStore", () => {
  it("generates a unique auth code", () => {
    const code1 = generateAuthCode("user123");
    const code2 = generateAuthCode("user123");

    assert.equal(typeof code1, "string");
    assert.equal(code1.length, 48);
    assert.notEqual(code1, code2);
  });

  it("returns userId when consuming a valid code", () => {
    const code = generateAuthCode("user456");
    const userId = consumeAuthCode(code);

    assert.equal(userId, "user456");
  });

  it("returns null when consuming a bogus code", () => {
    const result = consumeAuthCode("bogus-code-123");

    assert.equal(result, null);
  });

  it("deletes code after first consumption", () => {
    const code = generateAuthCode("user789");
    consumeAuthCode(code);

    const secondAttempt = consumeAuthCode(code);
    assert.equal(secondAttempt, null);
  });

  it("generates unique codes for different users", () => {
    const code1 = generateAuthCode("user111");
    const code2 = generateAuthCode("user222");

    assert.notEqual(code1, code2);

    assert.equal(consumeAuthCode(code1), "user111");
    assert.equal(consumeAuthCode(code2), "user222");
  });
});
