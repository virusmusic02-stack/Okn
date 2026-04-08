// Web Crypto API Helper for End-to-End Encryption

export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

export async function exportPublicKey(key: CryptoKey) {
  const exported = await window.crypto.subtle.exportKey('jwk', key);
  return exported;
}

export async function importPublicKey(jwk: JsonWebKey) {
  return await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

export async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(text: string, sharedKey: CryptoKey) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sharedKey,
    enc.encode(text)
  );

  return {
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
  };
}

export async function encryptWithEphemeralKey(text: string, recipientPublicKey: CryptoKey) {
  const ephemeralKeyPair = await generateKeyPair();
  const sharedKey = await deriveSharedKey(ephemeralKeyPair.privateKey, recipientPublicKey);
  const ephemeralPublicKeyJwk = await exportPublicKey(ephemeralKeyPair.publicKey);
  
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sharedKey,
    enc.encode(text)
  );

  return {
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
    ephemeralPublicKey: ephemeralPublicKeyJwk,
  };
}

export async function decryptWithEphemeralKey(
  encryptedData: { ciphertext: number[]; iv: number[]; ephemeralPublicKey: JsonWebKey },
  myPrivateKey: CryptoKey
) {
  const ephemeralPublicKey = await importPublicKey(encryptedData.ephemeralPublicKey);
  const sharedKey = await deriveSharedKey(myPrivateKey, ephemeralPublicKey);
  
  const dec = new TextDecoder();
  const ciphertext = new Uint8Array(encryptedData.ciphertext);
  const iv = new Uint8Array(encryptedData.iv);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      sharedKey,
      ciphertext
    );
    return dec.decode(decrypted);
  } catch (e) {
    console.error('Decryption failed', e);
    return '[Encrypted Message - Decryption Failed]';
  }
}

