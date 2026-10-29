import { AuditMetadata } from '@/types/audit';

// Disallowed metadata keys that must never leak into non-secret audit logs
const DISALLOWED_METADATA_KEYS = new Set([
  'password',
  'passphrase',
  'key',
  'dek',
  'kek',
  'rawkey',
  'share',
  'shares',
  'secret',
  'plaintext',
  'asset',
  'assets',
  'token',
]);

/**
 * Filter and sanitize audit event metadata to enforce privacy boundaries.
 * Strictly strips any disallowed or sensitive field names.
 */
export function sanitizeAuditMetadata(metadata: Record<string, unknown>): AuditMetadata {
  const sanitized: AuditMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (DISALLOWED_METADATA_KEYS.has(lowerKey)) {
      throw new Error(`Audit metadata rejected: sensitive key '${key}' is prohibited`);
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      sanitized[key] = value;
    } else {
      throw new Error(`Audit metadata rejected: value for key '${key}' must be primitive`);
    }
  }

  return sanitized;
}

/**
 * Canonical JSON serialization conforming to RFC 8785 (JSON Canonicalization Scheme).
 * Deterministically sorts object keys lexicographically and produces stable UTF-8 strings.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const elements = obj.map((item) => canonicalJsonStringify(item));
    return `[${elements.join(',')}]`;
  }

  // Object key sorting in lexicographical order (RFC 8785)
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJsonStringify(value)}`);
    }
  }

  return `{${entries.join(',')}}`;
}
