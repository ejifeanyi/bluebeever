import { prisma } from '@/config/database';
import { CreateUser, User } from '@crate/shared';

export class UserService {
  static async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({
      where: { googleId },
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async create(userData: CreateUser) {
    return prisma.user.create({
      data: userData,
    });
  }

  static async updateTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresAt,
      },
    });
  }

  static async refreshTokens(userId: string, accessToken: string, expiresAt: Date) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        accessToken,
        tokenExpiresAt: expiresAt,
      },
    });
  }

  static async clearTokens(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      },
    });
  }
}