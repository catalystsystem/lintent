import { describe, expect, it } from 'bun:test';
import { mapOrderServerStatus } from '$lib/domain/intents/status';

describe('mapOrderServerStatus', () => {
  it('maps known order server statuses', () => {
    expect(mapOrderServerStatus('Submitted')).toBe('created');
    expect(mapOrderServerStatus('Open')).toBe('opened');
    expect(mapOrderServerStatus('Delivered')).toBe('delivered');
    expect(mapOrderServerStatus('Settled')).toBe('finalised');
  });

  it('returns error for unknown status', () => {
    expect(mapOrderServerStatus('')).toBe('error');
    expect(mapOrderServerStatus('UNKNOWN')).toBe('error');
  });
});
