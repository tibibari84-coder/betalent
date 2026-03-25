/**
 * Browser-safe helpers: tolerate empty bodies, HTML error pages, and invalid JSON so UI never hangs on `res.json()`.
 */

export type ParsedApiFailure = {
  ok: false;
  status: number;
  message: string;
  code?: string;
  step?: string;
};

export type ParsedApiSuccess<T> = { ok: true; status: number; data: T };

export type ParsedApiResult<T> = ParsedApiSuccess<T> | ParsedApiFailure;

const DEFAULT_SERVER_ERROR = 'Something went wrong. Please try again.';
const DEFAULT_CLIENT_ERROR = 'Request failed. Please try again.';

function readMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  return fallback;
}

function readCodeFromBody(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'code' in body) {
    const c = (body as { code?: unknown }).code;
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

function readStepFromBody(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'step' in body) {
    const s = (body as { step?: unknown }).step;
    if (typeof s === 'string' && s.trim()) return s.trim();
  }
  return undefined;
}

/**
 * Parse a fetch Response body as JSON when possible; never throws.
 */
export async function parseResponseJsonUnknown(res: Response): Promise<{
  parseFailed: boolean;
  body: unknown;
}> {
  const text = await res.text();
  if (!text.trim()) {
    return { parseFailed: false, body: null };
  }
  try {
    return { parseFailed: false, body: JSON.parse(text) as unknown };
  } catch {
    return { parseFailed: true, body: null };
  }
}

/**
 * Interpret JSON (or non-JSON) API response for client-side flows.
 * Treat HTTP 2xx + `{ ok: true }` as success; otherwise failure with a user-safe message.
 */
export async function interpretApiResponse<T = Record<string, unknown>>(
  res: Response
): Promise<ParsedApiResult<T>> {
  const { parseFailed, body } = await parseResponseJsonUnknown(res);
  if (parseFailed) {
    return {
      ok: false,
      status: res.status,
      message: res.ok ? DEFAULT_SERVER_ERROR : res.status >= 500 ? DEFAULT_SERVER_ERROR : DEFAULT_CLIENT_ERROR,
    };
  }

  const successEnvelope =
    res.ok && body && typeof body === 'object' && (body as { ok?: unknown }).ok === true;

  if (successEnvelope) {
    return { ok: true, status: res.status, data: body as T };
  }

  const fallback =
    res.status >= 500 ? DEFAULT_SERVER_ERROR : res.status === 401 ? 'Login required' : DEFAULT_CLIENT_ERROR;

  return {
    ok: false,
    status: res.status,
    message: readMessageFromBody(body, fallback),
    code: readCodeFromBody(body),
    step: readStepFromBody(body),
  };
}
