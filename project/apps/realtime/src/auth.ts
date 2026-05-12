import jwt from 'jsonwebtoken';

interface TokenPayload {
  sub: string;
  email: string;
  orgId: string;
  role: string;
  name?: string;
}

export class AuthManager {
  constructor(private secret: string) {}

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.secret, { clockTolerance: 60 }) as TokenPayload;
  }

  signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: '24h',
      issuer: 'aasop-realtime',
    });
  }

  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}
