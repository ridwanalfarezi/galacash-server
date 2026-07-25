import { AccessTokenPayload } from '../utils/generate-tokens.js';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      fileUrl?: string;
    }
  }
}

export {};
