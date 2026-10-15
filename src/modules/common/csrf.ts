import { createHmac } from 'crypto';
import { doubleCsrf } from 'csrf-csrf';

export const CSRF_COOKIE_NAME = 'csrf_token';

type CsrfOptions = {
  csrfSecret?: string;
  tokenHashSecret: string;
  production: boolean;
  cookieDomain?: string;
};

// Replaces the discontinued csurf keeping the same contract: GET /csrf-token returns the token and every
// POST, PATCH, PUT or DELETE must send it back in the X-CSRF-Token header.
export function createCsrfProtection({ csrfSecret, tokenHashSecret, production, cookieDomain }: CsrfOptions) {
  // Without a dedicated CSRF_SECRET the key is derived from TOKEN_HASH_SECRET, so existing deployments keep working.
  const secret = csrfSecret || createHmac('sha256', tokenHashSecret).update('csrf').digest('hex');

  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => secret,
    // The API keeps no server-side session and the front-end asks for a new token right before each change,
    // so the token is tied to the browser cookie only, exactly as it was with csurf.
    getSessionIdentifier: () => '',
    cookieName: CSRF_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: production, //Exige https em prod
      sameSite: production ? ('none' as const) : ('lax' as const),
      domain: cookieDomain,
      path: '/',
    },
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
  });

  return doubleCsrfProtection;
}
