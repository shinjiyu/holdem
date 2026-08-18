import { describe, expect, it } from "vitest";
import type { SeatPort } from "../../../src/contracts/seat";
import { SeatPlugin } from "../../../src/seat";

describe("SeatPort", () => {
  it("is implemented by SeatPlugin without hosts", () => {
    const port: SeatPort = new SeatPlugin();
    const you = port.sit({ seat: 0, githubLogin: "fake-carol" });
    expect(you.githubLogin).toBe("fake-carol");
    expect(you.control).toBe("manual");
    expect(port.view({ seat: 0 }).seat).toBe(0);
  });
});
