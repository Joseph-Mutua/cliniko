import { createHmac, timingSafeEqual } from "node:crypto";

export type MagicLinkPayload = {
  tenantSlug: string;
  patientId: string;
  expiresAt: number;
};

function encode(payload: MagicLinkPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decode(raw: string): MagicLinkPayload {
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as MagicLinkPayload;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function mintMagicLinkToken(payload: MagicLinkPayload, secret: string): string {
  const encoded = encode(payload);
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifyMagicLinkToken(token: string, secret: string): MagicLinkPayload | null {
  const [encoded, providedSig] = token.split(".");
  if (!encoded || !providedSig) {
    return null;
  }
  const expectedSig = sign(encoded, secret);
  const providedBuffer = Buffer.from(providedSig);
  const expectedBuffer = Buffer.from(expectedSig);
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }
  const payload = decode(encoded);
  if (payload.expiresAt < Date.now()) {
    return null;
  }
  return payload;
}