/** Table config — infra, not a plugin. */

export interface TableConfig {
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  /** One-time chips if githubLogin starred the public repo. */
  starGrantChips: number;
  starGrantRepo: string;
}

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  maxSeats: 6,
  smallBlind: 50,
  bigBlind: 100,
  startingStack: 10_000,
  starGrantChips: 10_000,
  starGrantRepo: "shinjiyu/holdem",
};
