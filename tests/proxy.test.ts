import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, getCorsHeaders } from '../api/proxy';

describe('Backend Proxy Security & Rate Limiting Tests', () => {
  it('AUTO-08: allows requests within limit and throttles after exceeding max requests', () => {
    const testIp = '192.168.1.100';
    const limit = 5;

    for (let i = 0; i < limit; i++) {
      expect(checkRateLimit(testIp, limit)).toBe(true);
    }

    // 6th request within window must be rejected
    expect(checkRateLimit(testIp, limit)).toBe(false);
  });

  it('AUTO-10: generates correct CORS headers for allowed origins', () => {
    const allowed = ['https://ptymek.github.io', 'http://localhost:5173'];
    const headers = getCorsHeaders('https://ptymek.github.io', allowed);

    expect(headers['Access-Control-Allow-Origin']).toBe('https://ptymek.github.io');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
  });
});
