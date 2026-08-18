/** GitHub OAuth + table tokens. Infra, not a plugin. */
export interface TableToken {
  tableId: string;
  seat: number;
  githubLogin: string;
}

/** Star-grant is checked here; credit goes through BankPort (compose wires). */
export interface StarGrantCheck {
  githubLogin: string;
  starred: boolean;
  alreadyClaimed: boolean;
}

export function authId(): "auth" {
  return "auth";
}
