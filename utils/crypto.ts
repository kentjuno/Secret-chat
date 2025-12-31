// Utility for AES-GCM Encryption using Web Crypto API

export const deriveKey = async (password: string, salt: string = 'ghostlink_salt'): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptMessage = async (data: string | Uint8Array, key: CryptoKey): Promise<string> => {
  const enc = new TextEncoder();
  // If data is already Uint8Array, use it; otherwise encode string to utf-8 bytes
  const encoded = typeof data === 'string' ? enc.encode(data) : data;
  
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encoded
  );

  // Combine IV and ciphertext for transmission
  const ivArray = Array.from(iv);
  const ciphertextArray = Array.from(new Uint8Array(ciphertext));
  
  return JSON.stringify({ iv: ivArray, data: ciphertextArray });
};

export const decryptMessage = async (payloadStr: string, key: CryptoKey, asBinary: boolean = false): Promise<string | Uint8Array> => {
  try {
    const payload = JSON.parse(payloadStr);
    const iv = new Uint8Array(payload.iv);
    const data = new Uint8Array(payload.data);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      data
    );

    if (asBinary) {
        return new Uint8Array(decrypted);
    }

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error("Failed to decrypt");
  }
};