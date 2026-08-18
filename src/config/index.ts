/** Table config — infra, not a plugin. */

export interface TableConfig {
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  /** One-time chips if githubLogin starred the public repo. */
  starGrantChips: number;
  starGrantRepo: string;
  /** Per-turn action deadline (ms). Expired → check if legal, else fold. */
  actionTimeoutMs: number;
}

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  maxSeats: 6,
  smallBlind: 50,
  bigBlind: 100,
  startingStack: 10_000,
  starGrantChips: 1_000_000,
  starGrantRepo: "shinjiyu/holdem",
  actionTimeoutMs: 30_000,
};
