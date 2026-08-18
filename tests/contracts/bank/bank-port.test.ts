import { describe, expect, it } from "vitest";
import type {
  BankPort,
  GrantRequest,
  PostBlindsRequest,
  SettleRequest,
  SitRequest,
} from "../../../src/contracts/bank";

describe("BankPort contract", () => {
  it("loads contracts/bank at runtime", async () => {
    const mod = await import("../../../src/contracts/bank");
    expect(mod).toBeDefined();
  });

  it("accepts sit, postBlinds, settle, and grant shapes", () => {
    const sit: SitRequest = { seat: 0, githubLogin: "alice" };
    const blinds: PostBlindsRequest = { sbSeat: 0, bbSeat: 1 };
    const settle: SettleRequest = { winners: [{ seat: 0, amount: 150 }] };
    const grant: GrantRequest = { githubLogin: "alice", amount: 10_000 };

    const port: BankPort = {
      sit: () => undefined,
      postBlinds: () => undefined,
      settle: () => undefined,
      grant: () => undefined,
      stack: () => 0,
      pot: () => 0,
    };

    port.sit(sit);
    port.postBlinds(blinds);
    port.settle(settle);
    port.grant(grant);
    expect(port.stack(0)).toBe(0);
    expect(port.pot()).toBe(0);
    expect(grant.amount).toBe(10_000);
  });
});
