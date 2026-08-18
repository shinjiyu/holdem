import { describe, expect, it } from "vitest";
import { SeatPlugin } from "../../src/seat";
import type { Card } from "../../src/contracts/shared/dto";

function key(c: Card): string {
  return `${c.rank}${c.suit}`;
}

describe("REQ-SEAT-PORT", () => {
  it("sits a fake githubLogin with default control=manual", () => {
    const seats = new SeatPlugin();
    const occupant = seats.sit({ seat: 0, githubLogin: "fake-alice" });
    expect(occupant.githubLogin).toBe("fake-alice");
    expect(occupant.control).toBe("manual");
    expect(seats.view({ seat: 0 }).you.control).toBe("manual");
    expect(seats.view({ seat: 0 }).you.githubLogin).toBe("fake-alice");
  });

  it("setControl hosted then take-back to manual on the same seat", () => {
    const seats = new SeatPlugin();
    seats.sit({ seat: 2, githubLogin: "fake-octocat" });
    expect(seats.setControl({ seat: 2, control: "hosted" }).control).toBe("hosted");
    expect(seats.view({ seat: 2 }).you.control).toBe("hosted");
    expect(seats.setControl({ seat: 2, control: "manual" }).control).toBe("manual");
    expect(seats.view({ seat: 2 }).you.control).toBe("manual");
  });

  it("view.hole for seat A does not include seat B hole cards", () => {
    const seats = new SeatPlugin();
    seats.sit({ seat: 0, githubLogin: "fake-alice" });
    seats.sit({ seat: 1, githubLogin: "fake-bob" });
    const holeA: Card[] = [
      { rank: "A", suit: "s" },
      { rank: "K", suit: "h" },
    ];
    const holeB: Card[] = [
      { rank: "2", suit: "c" },
      { rank: "7", suit: "d" },
    ];
    seats.setHole({ seat: 0, cards: holeA });
    seats.setHole({ seat: 1, cards: holeB });

    const viewA = seats.view({ seat: 0 });
    const viewB = seats.view({ seat: 1 });

    expect(viewA.seat).toBe(0);
    expect(viewB.seat).toBe(1);
    expect(viewA.hole.map(key)).toEqual(["As", "Kh"]);
    expect(viewB.hole.map(key)).toEqual(["2c", "7d"]);
    for (const card of holeB) {
      expect(viewA.hole.map(key)).not.toContain(key(card));
    }
    expect(JSON.stringify(viewA)).not.toContain('"rank":"2"');
    expect(JSON.stringify(viewA)).not.toContain('"suit":"c"');
  });

  it("rejects a second githubLogin on an occupied seat", () => {
    const seats = new SeatPlugin();
    seats.sit({ seat: 0, githubLogin: "fake-alice" });
    expect(() => seats.sit({ seat: 0, githubLogin: "fake-bob" })).toThrow();
    expect(seats.view({ seat: 0 }).you.githubLogin).toBe("fake-alice");
  });
});
