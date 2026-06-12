import { compareSecret } from "../../../utils/password.js";

export async function findAccountByPasswordSetupToken(accounts, token) {
  for (const account of accounts) {
    if (await compareSecret(token, account.passwordSetTokenHash)) {
      return account;
    }
  }

  return null;
}
