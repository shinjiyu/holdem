import { describe, expect, it } from "vitest";
import { createRuntime, DEFAULT_HAND_ORDER } from "../../src/runtime";
import { createTableApp } from "../../src/app";

describe("REQ-TABLE-SESSION runtime", () => {
  it("hand order covers wired plugins", () => {
    const { session, runtime } = createTableApp();
    const ids = session.plugins().map((p) => p.id);
    expect([...DEFAULT_HAND_ORDER]).toEqual(expect.arrayContaining(ids));
    expect(() => runtime.stepOnce()).not.toThrow();
    expect(() => createRuntime(session.plugins()).stepOnce()).not.toThrow();
  });
});
