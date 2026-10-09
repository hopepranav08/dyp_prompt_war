import type { RequestHandler, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthUser {
  uid: string;
  anonymous: boolean;
  email?: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<AuthUser>;
}

const GOOGLE_SECURETOKEN_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * Verifies Identity Platform (Firebase Auth) ID tokens locally against Google's rotating public keys:
 * signature, issuer, audience and expiry. No service-account key or extra SDK needed.
 */
export class IdentityPlatformVerifier implements TokenVerifier {
  private readonly jwks = createRemoteJWKSet(new URL(GOOGLE_SECURETOKEN_JWKS));

  constructor(private readonly projectId: string) {}

  async verify(token: string): Promise<AuthUser> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: `https://securetoken.google.com/${this.projectId}`,
      audience: this.projectId,
      algorithms: ['RS256'],
    });
    if (!payload.sub) throw new Error('Token has no subject');
    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    return { uid: payload.sub, anonymous: provider === 'anonymous', email: typeof payload.email === 'string' ? payload.email : undefined };
  }
}

export const currentUser = (res: Response): AuthUser | undefined => res.locals.user as AuthUser | undefined;

/** Optional auth: a valid Bearer token attaches the user; a bad token is rejected; no token = guest. */
export function optionalAuth(verifier?: TokenVerifier): RequestHandler {
  return async (req, res, next) => {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ') || !verifier) return next();
    try {
      res.locals.user = await verifier.verify(header.slice(7));
      next();
    } catch {
      res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    }
  };
}
