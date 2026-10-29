/**
 * Cloudflare Worker entry point.
 * Secrets: `npx wrangler secret put OPENROUTER_API_KEY` (never committed).
 * Vars: ALLOWED_ORIGINS, OPENROUTER_MODEL, RATE_LIMIT_PER_MINUTE (see wrangler.toml).
 */

import { handleAnalyzeRequest, type ProxyEnv } from './proxy';

export default {
  /**
   * Funkcja jest punktem wejścia Workera Cloudflare dla każdego żądania HTTP.
   * Ścieżka /api/analyze: funkcja przekazuje żądanie do handleAnalyzeRequest.
   * Ścieżka /health: funkcja zwraca "ok" (kontrola działania).
   * Inna ścieżka: funkcja zwraca 404.
   *
   * Wejście:
   *   - request – żądanie HTTP (Request),
   *   - env – zmienne i sekrety Workera (ProxyEnv).
   * Wyjście: Promise z odpowiedzią HTTP (Response).
   */
  async fetch(request: Request, env: ProxyEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/analyze') {
      return handleAnalyzeRequest(request, env);
    }
    if (pathname === '/health') {
      return new Response('ok', { status: 200 });
    }
    return new Response('Not found', { status: 404 });
  },
};
