import { Request, Response } from "express";
import { AuthService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
import { getAuthUrl } from "@/config/google";
import { createSuccessResponse, createErrorResponse } from "@crate/shared";
import { ERROR_CODES } from "@crate/shared";
import { AuthenticatedRequest } from "@/middleware/auth";
import { env } from "@/config/env";

export class AuthController {
  static async googleAuth(req: Request, res: Response) {
    try {
      const authUrl = getAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(
            ERROR_CODES.INTERNAL_ERROR,
            "Failed to generate auth URL"
          )
        );
    }
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res
          .status(400)
          .json(
            createErrorResponse(
              ERROR_CODES.VALIDATION_ERROR,
              "Authorization code is required"
            )
          );
      }

      const { user, token } = await AuthService.handleGoogleCallback(code);

      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      };

      res.redirect(`${env.FRONTEND_URL}/auth/success?token=${token}`);
    } catch (error) {
      if (env.NODE_ENV === "development") {
        res
          .status(500)
          .json(
            createErrorResponse(
              ERROR_CODES.INTERNAL_ERROR,
              "Authentication failed"
            )
          );
      } else {
        res.redirect(`${env.FRONTEND_URL}/auth/error`);
      }
    }
  }

  static async refreshToken(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(
            createErrorResponse(
              ERROR_CODES.UNAUTHORIZED,
              "User not authenticated"
            )
          );
      }

      const user = await AuthService.refreshUserTokens(req.user.userId);

      res.json(
        createSuccessResponse({
          tokenExpiresAt: user.tokenExpiresAt,
        })
      );
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(
            ERROR_CODES.INTERNAL_ERROR,
            "Failed to refresh token"
          )
        );
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(
            createErrorResponse(
              ERROR_CODES.UNAUTHORIZED,
              "User not authenticated"
            )
          );
      }

      await AuthService.logout(req.user.userId);

      res.json(createSuccessResponse(null, "Logged out successfully"));
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(ERROR_CODES.INTERNAL_ERROR, "Failed to logout")
        );
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(
            createErrorResponse(
              ERROR_CODES.UNAUTHORIZED,
              "User not authenticated"
            )
          );
      }

      const user = await UserService.findById(req.user.userId);

      if (!user) {
        return res
          .status(404)
          .json(createErrorResponse(ERROR_CODES.NOT_FOUND, "User not found"));
      }

      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        createdAt: user.createdAt,
      };

      res.json(createSuccessResponse(userData));
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorResponse(ERROR_CODES.INTERNAL_ERROR, "Failed to get user")
        );
    }
  }
}
