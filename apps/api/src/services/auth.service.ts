import { oauth2Client } from '@/config/google';
import { UserService } from './user.service';
import { signToken } from '@/utils/jwt';
import { isTokenExpiringSoon } from '@crate/shared';

export class AuthService {
  static async handleGoogleCallback(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Invalid tokens received from Google');
    }

    oauth2Client.setCredentials(tokens);

    const oauth2 = await import('googleapis').then(g => g.google.oauth2('v2'));
    const { data: profile } = await oauth2.userinfo.get({ auth: oauth2Client });

    if (!profile.email || !profile.id) {
      throw new Error('Unable to retrieve user profile from Google');
    }

    let expiresAt: Date;
    if (tokens.expiry_date) {
      expiresAt = new Date(tokens.expiry_date);
    } else {
      console.warn('⚠️ No expiry_date in tokens, defaulting to 1 hour');
      expiresAt = new Date(Date.now() + (3600 * 1000));
    }

    let user = await UserService.findByGoogleId(profile.id);

    if (user) {
      user = await UserService.updateTokens(
        user.id,
        tokens.access_token,
        tokens.refresh_token,
        expiresAt
      );
    } else {
      user = await UserService.create({
        email: profile.email,
        name: profile.name || profile.email,
        picture: profile.picture ?? undefined,
        googleId: profile.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token!,
        tokenExpiresAt: expiresAt,
      });
    }

    const jwtToken = signToken({
      userId: user.id,
      email: user.email,
    });

    return { user, token: jwtToken };
  }

  static async refreshUserTokens(userId: string) {
    const user = await UserService.findById(userId);
    
    if (!user?.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!user.tokenExpiresAt || !isTokenExpiringSoon(user.tokenExpiresAt)) {
      return user;
    }

    oauth2Client.setCredentials({
      refresh_token: user.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    if (!credentials.expiry_date) {
      throw new Error('Missing expiry_date in refreshed credentials');
    }
    const expiresAt = new Date(credentials.expiry_date);

    return UserService.refreshTokens(userId, credentials.access_token, expiresAt);
  }

  static async logout(userId: string) {
    return UserService.clearTokens(userId);
  }
}