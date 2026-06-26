function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binString = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binString = atob(base64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSession(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = base64UrlEncode(payloadStr);

  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadBase64)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let binString = '';
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binString += String.fromCharCode(signatureBytes[i]);
  }
  const signatureBase64 = btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${payloadBase64}.${signatureBase64}`;
}

export async function verifySession(token: string, secret: string): Promise<any | null> {
  if (!token || !secret) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadBase64, signatureBase64] = parts;

    const key = await getCryptoKey(secret);
    const encoder = new TextEncoder();

    const signatureBase64WithPadding = signatureBase64.replace(/-/g, '+').replace(/_/g, '/');
    const signatureStr = atob(signatureBase64WithPadding);
    const signatureBytes = new Uint8Array(signatureStr.length);
    for (let i = 0; i < signatureStr.length; i++) {
      signatureBytes[i] = signatureStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadBase64)
    );

    if (!isValid) return null;

    const payloadStr = base64UrlDecode(payloadBase64);
    const payload = JSON.parse(payloadStr);

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch (err) {
    console.error('Session verification error:', err);
    return null;
  }
}
