import { AccessTokenPayload } from "@/utils/generate-tokens";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      fileUrl?: string;
    }
  }
}

export {};
