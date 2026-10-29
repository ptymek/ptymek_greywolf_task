/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'node:http';
import { handleAnalyzeRequest } from './api/proxy';

/**
 * Funkcja tworzy wtyczkę Vite z lokalnym proxy /api/analyze (tylko tryb dev).
 * Wtyczka zamienia żądanie Node na obiekt Request.
 * Potem wtyczka wywołuje handleAnalyzeRequest, tę samą funkcję co Worker.
 * Funkcja czyta klucz OPENROUTER_API_KEY z .env.local tylko po stronie Node.
 * Klucz nie ma prefiksu VITE_, dlatego nie trafia do kodu przeglądarki.
 *
 * Wejście: env – zmienne z plików .env (Record<string, string>).
 * Wyjście: wtyczka Vite (Plugin).
 */
function devApiProxy(env: Record<string, string>): Plugin {
  return {
    name: 'pdf-insight-dev-api',
    apply: 'serve',
    /**
     * Funkcja rejestruje middleware /api/analyze w serwerze dev Vite.
     * Middleware czyta treść żądania, wywołuje handleAnalyzeRequest i zapisuje odpowiedź.
     * Błąd middleware funkcja przekazuje do next().
     *
     * Wejście: server – serwer dev Vite (ViteDevServer).
     * Wyjście: brak.
     */
    configureServer(server) {
      server.middlewares.use('/api/analyze', (req: IncomingMessage, res, next) => {
        void (async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value);
          }
          const request = new Request(`http://localhost${req.url ?? ''}`, {
            method: req.method,
            headers,
            body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
          });
          const response = await handleAnalyzeRequest(request, {
            OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
            OPENROUTER_MODEL: env.OPENROUTER_MODEL,
            ALLOWED_ORIGINS: env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173',
            RATE_LIMIT_PER_MINUTE: env.RATE_LIMIT_PER_MINUTE || '30',
          });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        })().catch(next);
      });
    },
  };
}

/**
 * Funkcja tworzy konfigurację Vite i Vitest.
 * Funkcja ustawia ścieżkę bazową z VITE_BASE_PATH (GitHub Pages) albo "./".
 * Funkcja dzieli bundle na części: pdfjs i vendor.
 *
 * Wejście: obiekt z polem mode – tryb Vite, np. "development" (ConfigEnv).
 * Wyjście: konfiguracja Vite (UserConfig).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), devApiProxy(env)],
    // GitHub Pages serves from /<repo>/ – CI sets VITE_BASE_PATH, relative base works too.
    base: process.env.VITE_BASE_PATH || './',
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            pdfjs: ['pdfjs-dist'],
            vendor: ['react', 'react-dom', 'zod', 'lucide-react'],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
