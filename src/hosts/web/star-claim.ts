import { DEFAULT_TABLE_CONFIG } from "../../config";
import type { BankPort } from "../../contracts/bank";
import {
  checkStarGrant,
  StarGrantLedger,
  type StarStatusFetcher,
} from "../../auth/star-grant";

export interface StarClaimResult {
  granted: number;
}

/**
 * H5 "I starred — claim chips" button. Checks via auth helper, credits via BankPort.
 * Does not import GitHub SDK into bank; no unstar clawback.
 */
export class StarClaimHost {
  private readonly ledger: StarGrantLedger;
  private readonly amount: number;

  constructor(
    private readonly bank: BankPort,
    private readonly fetcher: StarStatusFetcher,
    opts?: { ledger?: StarGrantLedger; amount?: number },
  ) {
    this.ledger = opts?.ledger ?? new StarGrantLedger();
    this.amount = opts?.amount ?? DEFAULT_TABLE_CONFIG.starGrantChips;
  }

  async claim(githubLogin: string, accessToken: string): Promise<StarClaimResult> {
    const gate = await checkStarGrant({
      githubLogin,
      accessToken,
      fetcher: this.fetcher,
      ledger: this.ledger,
    });
    if (!gate.ok) {
      throw new Error(`star claim denied: ${gate.reason}`);
    }
    this.bank.grant({ githubLogin, amount: this.amount });
    this.ledger.markClaimed(githubLogin);
    return { granted: this.amount };
  }
}
