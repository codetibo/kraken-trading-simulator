import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock better-auth/cookies
const mockGetSessionCookie = jest.fn<() => string | null>();
jest.mock('better-auth/cookies', () => ({
  getSessionCookie: () => mockGetSessionCookie(),
}));

import { proxy, config } from '@/proxy';

function createRequest(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

describe('Route Protection (proxy)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /sign-in when no session cookie exists', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/dashboard');
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/sign-in');
  });

  it('allows request through when session cookie exists', async () => {
    mockGetSessionCookie.mockReturnValue('valid-session-token');
    const request = createRequest('http://localhost:3000/trade');
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it('allows request through for /dashboard with session', async () => {
    mockGetSessionCookie.mockReturnValue('valid-session-token');
    const request = createRequest('http://localhost:3000/dashboard');
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it('redirects for /settings when unauthenticated', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/settings');
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/sign-in');
  });

  it('redirects for /portfolio when unauthenticated', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/portfolio');
    const response = await proxy(request);

    expect(response.status).toBe(307);
  });

  it('redirects for /orders when unauthenticated', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/orders');
    const response = await proxy(request);

    expect(response.status).toBe(307);
  });

  it('redirects for /positions when unauthenticated', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/positions');
    const response = await proxy(request);

    expect(response.status).toBe(307);
  });

  it('redirects for /history when unauthenticated', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/history');
    const response = await proxy(request);

    expect(response.status).toBe(307);
  });

  it('redirects for /education when unauthenticated', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/education');
    const response = await proxy(request);

    expect(response.status).toBe(307);
  });

  it('redirects for /backtest when unauthenticated', async () => {
    mockGetSessionCookie.mockReturnValue(null);
    const request = createRequest('http://localhost:3000/backtest');
    const response = await proxy(request);

    expect(response.status).toBe(307);
  });
});

describe('Proxy config matcher', () => {
  it('has valid matcher config', () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher.length).toBeGreaterThan(0);
  });
});
