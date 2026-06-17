import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { decryptSecret } from "@/lib/crypto";

const defaultScopes = [
  "pages_show_list",
  "instagram_business_basic",
  "instagram_business_content_publish"
];

type MetaAccountResponse = {
  data?: Array<{
    id: string;
    name: string;
    access_token?: string;
    instagram_business_account?: {
      id: string;
      username?: string;
    };
  }>;
};

type MetaTokenResponse = {
  access_token: string;
  expires_in?: number;
};

type MetaContainerResponse = {
  id: string;
};

type MetaPublishResponse = {
  id: string;
};

type MetaStatusResponse = {
  status_code?: string;
};

export type ConnectedInstagramAccount = {
  pageId: string;
  pageName: string;
  instagramBusinessAccountId: string;
  instagramUsername: string;
  pageAccessToken: string;
  tokenExpiresAt: string | null;
};

export type SocialAccountRecord = {
  id: string;
  instagram_business_account_id: string;
  access_token_encrypted: string;
};

export function createMetaOAuthUrl(userId: string) {
  const appId = getMetaAppId();
  const redirectUri = getMetaRedirectUri();
  const state = createSignedOAuthState(userId);
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: defaultScopes.join(","),
    state
  });

  return `https://www.facebook.com/${getMetaGraphVersion()}/dialog/oauth?${params.toString()}`;
}

export function verifyMetaOAuthState(state: string) {
  const [payload, signature] = state.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signStatePayload(payload);
  const received = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    exp: number;
    nonce: string;
    userId: string;
  };

  if (!decoded.userId || decoded.exp < Date.now()) {
    return null;
  }

  return decoded.userId;
}

export async function exchangeCodeForInstagramAccounts(code: string) {
  const redirectUri = getMetaRedirectUri();
  const shortToken = await metaGet<MetaTokenResponse>("/oauth/access_token", {
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    code,
    redirect_uri: redirectUri
  });
  const longToken = await metaGet<MetaTokenResponse>("/oauth/access_token", {
    client_id: getMetaAppId(),
    client_secret: getMetaAppSecret(),
    fb_exchange_token: shortToken.access_token,
    grant_type: "fb_exchange_token"
  });
  const tokenExpiresAt = longToken.expires_in
    ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
    : null;
  const accounts = await metaGet<MetaAccountResponse>("/me/accounts", {
    access_token: longToken.access_token,
    fields: "id,name,access_token,instagram_business_account{id,username}"
  });

  return (accounts.data || [])
    .filter((account) => account.access_token && account.instagram_business_account)
    .map((account) => ({
      pageId: account.id,
      pageName: account.name,
      instagramBusinessAccountId: account.instagram_business_account?.id || "",
      instagramUsername: account.instagram_business_account?.username || "",
      pageAccessToken: account.access_token || "",
      tokenExpiresAt
    }));
}

export async function publishInstagramMedia({
  account,
  caption,
  mediaUrls
}: {
  account: SocialAccountRecord;
  caption: string;
  mediaUrls: string[];
}) {
  const accessToken = decryptSecret(account.access_token_encrypted);

  if (mediaUrls.length === 0) {
    throw new Error("Nenhuma imagem publica encontrada para publicar.");
  }

  if (mediaUrls.length === 1) {
    const container = await createInstagramContainer({
      accessToken,
      caption,
      imageUrl: mediaUrls[0],
      instagramBusinessAccountId: account.instagram_business_account_id
    });

    await waitForContainer(container.id, accessToken);
    return publishContainer({
      accessToken,
      creationId: container.id,
      instagramBusinessAccountId: account.instagram_business_account_id
    });
  }

  const children = [];

  for (const mediaUrl of mediaUrls.slice(0, 10)) {
    const child = await createInstagramContainer({
      accessToken,
      imageUrl: mediaUrl,
      instagramBusinessAccountId: account.instagram_business_account_id,
      isCarouselItem: true
    });
    await waitForContainer(child.id, accessToken);
    children.push(child.id);
  }

  const carousel = await metaPost<MetaContainerResponse>(
    `/${account.instagram_business_account_id}/media`,
    {
      access_token: accessToken,
      caption,
      children: children.join(","),
      media_type: "CAROUSEL"
    }
  );

  await waitForContainer(carousel.id, accessToken);
  return publishContainer({
    accessToken,
    creationId: carousel.id,
    instagramBusinessAccountId: account.instagram_business_account_id
  });
}

async function createInstagramContainer({
  accessToken,
  caption,
  imageUrl,
  instagramBusinessAccountId,
  isCarouselItem = false
}: {
  accessToken: string;
  caption?: string;
  imageUrl: string;
  instagramBusinessAccountId: string;
  isCarouselItem?: boolean;
}) {
  return metaPost<MetaContainerResponse>(`/${instagramBusinessAccountId}/media`, {
    access_token: accessToken,
    ...(caption ? { caption } : {}),
    image_url: imageUrl,
    ...(isCarouselItem ? { is_carousel_item: "true" } : {})
  });
}

async function publishContainer({
  accessToken,
  creationId,
  instagramBusinessAccountId
}: {
  accessToken: string;
  creationId: string;
  instagramBusinessAccountId: string;
}) {
  return metaPost<MetaPublishResponse>(
    `/${instagramBusinessAccountId}/media_publish`,
    {
      access_token: accessToken,
      creation_id: creationId
    }
  );
}

async function waitForContainer(containerId: string, accessToken: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const status = await metaGet<MetaStatusResponse>(`/${containerId}`, {
      access_token: accessToken,
      fields: "status_code"
    });

    if (status.status_code === "FINISHED") {
      return;
    }

    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new Error(`Container Instagram ficou com status ${status.status_code}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error("Container Instagram nao ficou pronto a tempo.");
}

async function metaGet<T>(path: string, params: Record<string, string>) {
  const url = new URL(`https://graph.facebook.com/${getMetaGraphVersion()}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url);

  return parseMetaResponse<T>(response);
}

async function metaPost<T>(path: string, params: Record<string, string>) {
  const response = await fetch(
    `https://graph.facebook.com/${getMetaGraphVersion()}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(params)
    }
  );

  return parseMetaResponse<T>(response);
}

async function parseMetaResponse<T>(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      "Erro ao falar com a Meta Graph API.";
    throw new Error(message);
  }

  return data as T;
}

function createSignedOAuthState(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 10 * 60 * 1000,
      nonce: randomBytes(16).toString("base64url"),
      userId
    })
  ).toString("base64url");

  return `${payload}.${signStatePayload(payload)}`;
}

function signStatePayload(payload: string) {
  return createHmac("sha256", getMetaAppSecret())
    .update(payload)
    .digest("base64url");
}

function getMetaAppId() {
  if (!process.env.META_APP_ID) {
    throw new Error("META_APP_ID nao configurado.");
  }

  return process.env.META_APP_ID;
}

function getMetaAppSecret() {
  if (!process.env.META_APP_SECRET) {
    throw new Error("META_APP_SECRET nao configurado.");
  }

  return process.env.META_APP_SECRET;
}

function getMetaRedirectUri() {
  if (process.env.META_REDIRECT_URI) {
    return process.env.META_REDIRECT_URI;
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("META_REDIRECT_URI ou NEXT_PUBLIC_APP_URL nao configurado.");
  }

  return `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/oauth/callback`;
}

function getMetaGraphVersion() {
  return process.env.META_GRAPH_VERSION || "v23.0";
}
