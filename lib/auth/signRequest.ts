import "server-only";

import { createSign, randomBytes } from "node:crypto";

const keyVersion = process.env.ECDSA_KEY_VERSION ?? process.env.JWT_KEY_ID ?? "v1.0";

function getPrivateKey() {
  if (process.env.ECDSA_PRIVATE_KEY) {
    return process.env.ECDSA_PRIVATE_KEY.replace(/\\n/g, "\n");
  }

  throw new Error("ECDSA_PRIVATE_KEY is required for signed backend requests.");
}

export function buildSignedHeaders({
  method,
  path,
  body,
  deviceId,
  jwt,
}: {
  method: string;
  path: string;
  body: string;
  deviceId: string;
  jwt?: string;
}) {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString("hex");
  const message = `${method.toUpperCase()}|${path}|${body}|${timestamp}|${nonce}|${deviceId}`;
  const signer = createSign("SHA256");

  signer.update(message);

  return {
    "Content-Type": "application/json",
    "X-Timestamp": timestamp,
    "X-Device-ID": deviceId,
    "X-Nonce": nonce,
    "X-Signature": signer.sign({ key: getPrivateKey(), dsaEncoding: "der" }, "base64"),
    "X-Key-Version": keyVersion,
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
}
