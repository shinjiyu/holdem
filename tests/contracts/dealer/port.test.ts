import { describe, expect, it } from "vitest";
import type { DealerPort, StartHandRequest } from "../../src/contracts/dealer";

describe("DealerPort DTO", () => {
  it("types a start-hand request", () => {
    const req: StartHandRequest = { seats: [0, 1], button: 0, seed: 3 };
    expect(req.seats).toHaveLength(2);
    const _port: Pick<DealerPort, "street"> = { street: "preflop" };
    expect(_port.street).toBe("preflop");
  });
});
