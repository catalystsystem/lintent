const CURSOR_PREFIX = 'o:';

export function encodeOffsetCursor(offset: number): string {
  return Buffer.from(`${CURSOR_PREFIX}${offset}`).toString('base64url');
}

export function decodeOffsetCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }

  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');

  if (!decoded.startsWith(CURSOR_PREFIX)) {
    return 0;
  }

  const parsed = Number(decoded.slice(CURSOR_PREFIX.length));

  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}
