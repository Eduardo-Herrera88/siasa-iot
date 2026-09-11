import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cifrado local de eWeLink/Sonoff (protocolo LAN, puerto 8081), verificado contra el codigo
 * fuente de SonoffLAN (AlexxIT): AES-128-CBC, clave = MD5(devicekey), IV aleatorio de 16 bytes,
 * PKCS7. No depende de la nube de eWeLink ni de Home Assistant una vez se tiene la devicekey.
 */

function deriveKey(devicekey: string): Buffer {
  return createHash("md5").update(devicekey, "utf8").digest();
}

export function encryptPayload(devicekey: string, payload: unknown): { data: string; iv: string } {
  const key = deriveKey(devicekey);
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-128-cbc", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { data: encrypted.toString("base64"), iv: iv.toString("base64") };
}

export function decryptPayload<T = unknown>(devicekey: string, data: string, iv: string): T {
  const key = deriveKey(devicekey);
  const decipher = createDecipheriv("aes-128-cbc", key, Buffer.from(iv, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
