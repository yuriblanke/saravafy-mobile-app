const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function normalizeCodeInput(value: string): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]/g, "")
    // Crockford aliases
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1");
}

export function isUuid(value: string): boolean {
  const v = String(value ?? "").trim();
  // Aceita UUID com ou sem version/variant estritos.
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    v
  );
}

function uuidToBytes(uuid: string): Uint8Array {
  if (!isUuid(uuid)) {
    throw new Error("invalid_uuid");
  }

  const hex = uuid.replace(/-/g, "");
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToUuid(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 16) {
    throw new Error("invalid_bytes");
  }

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20)
  );
}

function base32CrockfordEncode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      const idx = (value >>> (bits - 5)) & 31;
      out += CROCKFORD_ALPHABET[idx];
      bits -= 5;
    }
  }

  if (bits > 0) {
    const idx = (value << (5 - bits)) & 31;
    out += CROCKFORD_ALPHABET[idx];
  }

  return out;
}

function base32CrockfordDecode(code: string): Uint8Array {
  const normalized = normalizeCodeInput(code);
  if (!normalized) throw new Error("invalid_code");

  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const ch of normalized) {
    const idx = CROCKFORD_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("invalid_code");

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      const byte = (value >>> (bits - 8)) & 255;
      out.push(byte);
      bits -= 8;
    }
  }

  return new Uint8Array(out);
}

export function pontoIdToCode(pontoId: string): string {
  const bytes = uuidToBytes(pontoId);
  // 16 bytes -> ~26 chars em base32; bom tradeoff sem depender de backend.
  return base32CrockfordEncode(bytes);
}

export function pontoCodeToId(code: string): string {
  const bytes = base32CrockfordDecode(code);
  if (bytes.length !== 16) {
    throw new Error("invalid_code");
  }
  return bytesToUuid(bytes);
}
