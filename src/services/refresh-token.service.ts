import { RefreshTokenRepository } from "@/repositories/refresh-token.repository";

export class RefreshTokenService {
  private repository: RefreshTokenRepository;

  constructor() {
    this.repository = new RefreshTokenRepository();
  }

  async deleteAllByUserId(userId: string) {
    return this.repository.deleteByUserId(userId);
  }
}

export const refreshTokenService = new RefreshTokenService();
