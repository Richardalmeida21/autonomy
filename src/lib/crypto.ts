import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(value: string) {
  const raw = Buffer.from(value, "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv(algorithm, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString("utf8");
}

function getEncryptionKey() {
  const secret = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY nao configurada.");
  }

  const key = Buffer.from(secret, "base64");

  if (key.length !== 32) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY precisa ter 32 bytes em base64.");
  }

  return key;
}
