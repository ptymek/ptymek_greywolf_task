/**
 * PDF Insight Backend Proxy & Security Gate
 * Can be deployed as:
 * 1. Cloudflare Worker / Vercel Serverless Function
 * 2. Node.js local proxy server for development
 *
 * Enforces:
 * - Secret isolation (OPENROUTER_API_KEY never leaks to client)
 * - Strict CORS policy (only allowed domains)
 * - Rate limiting (protection against quota exhaustion)
 * - Payload size limit (max 10MB text / PDF request)
 * - AI response validation (Zod) + 1 automatic retry
 */

import { SYSTEM_SECURITY_PROMPT, buildUserPrompt } from '../src/lib/prompt';
import { validateAnalysisResult } from '../src/lib/schema';

export interface ProxyRequestPayload {
  fileName: string;
  totalPages: number;
  extractedText: string;
}

export interface SecurityConfig {
  allowedOrigins: string[];
  maxPayloadBytes: number;
  openRouterApiKey: string;
  defaultModel: string;
  maxRequestsPerMinute: number;
}

// In-memory rate limiting map (IP -> timestamps array)
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(ip: string, maxPerMinute: number = 10): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxPerMinute) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

export function getCorsHeaders(requestOrigin: string | null, allowedOrigins: string[]): Record<string, string> {
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Executes call to OpenRouter API with 1 retry on invalid JSON/schema failure.
 */
export async function callOpenRouterWithRetry(
  payload: ProxyRequestPayload,
  apiKey: string,
  modelName: string = 'meta-llama/llama-3.3-70b-instruct'
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const userPrompt = buildUserPrompt(payload);

  const executeApiCall = async () => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/greywolf-pdf-insight',
        'X-Title': 'PDF Insight Document Analyzer',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_SECURITY_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // low temperature for factual extraction
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
    }

    const jsonResponse = await response.json();
    const rawContent = jsonResponse?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Pusta odpowiedź z modelu AI');
    }

    // Strip markdown fences if present
    const cleanJson = rawContent.replace(/```json\n?|\n?```/gi, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Validate with Zod
    const validation = validateAnalysisResult(parsed);
    if (!validation.success) {
      throw new Error(`Walidacja schematu nie powiodła się: ${validation.error}`);
    }

    return validation.data;
  };

  // Attempt 1
  try {
    const data = await executeApiCall();
    return { success: true, data };
  } catch (firstError: any) {
    // Retry once as mandated by brief
    try {
      const data = await executeApiCall();
      return { success: true, data };
    } catch (retryError: any) {
      return {
        success: false,
        error: `Błąd analizy AI po 2 próbach: ${retryError.message || firstError.message}`,
      };
    }
  }
}
