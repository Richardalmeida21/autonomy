import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { getDatabase } from "@/lib/db";
import {
  exchangeCodeForInstagramAccounts,
  verifyMetaOAuthState
} from "@/lib/meta";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description");
  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (error) {
    return NextResponse.redirect(
      `${redirectBase}/dashboard?meta_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectBase}/dashboard?meta_error=${encodeURIComponent(
        "Retorno da Meta incompleto."
      )}`
    );
  }

  try {
    const userId = verifyMetaOAuthState(state);

    if (!userId) {
      throw new Error("Estado OAuth invalido ou expirado.");
    }

    const accounts = await exchangeCodeForInstagramAccounts(code);

    if (accounts.length === 0) {
      throw new Error(
        "Nenhuma conta Instagram profissional vinculada foi encontrada. Verifique se a Pagina selecionada tem um Instagram profissional conectado e se a configuracao de login da Meta inclui permissoes de Instagram."
      );
    }

    const database = getDatabase();

    for (const account of accounts) {
      await database.query(
        `insert into social_accounts (
           user_id, provider, page_id, page_name, instagram_business_account_id,
           instagram_username, access_token_encrypted, token_expires_at, status
         )
         values ($1, 'meta', $2, $3, $4, $5, $6, $7, 'connected')
         on conflict (user_id, instagram_business_account_id)
         do update set
           page_id = excluded.page_id,
           page_name = excluded.page_name,
           instagram_username = excluded.instagram_username,
           access_token_encrypted = excluded.access_token_encrypted,
           token_expires_at = excluded.token_expires_at,
           status = 'connected'`,
        [
          userId,
          account.pageId,
          account.pageName,
          account.instagramBusinessAccountId,
          account.instagramUsername,
          encryptSecret(account.pageAccessToken),
          account.tokenExpiresAt
        ]
      );
    }

    return NextResponse.redirect(`${redirectBase}/dashboard?meta_connected=1`);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Nao foi possivel conectar Instagram.";

    return NextResponse.redirect(
      `${redirectBase}/dashboard?meta_error=${encodeURIComponent(message)}`
    );
  }
}
