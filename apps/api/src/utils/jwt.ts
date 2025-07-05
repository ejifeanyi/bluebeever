import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { google } from 'googleapis';

export interface JwtPayload {
  userId: string;
  email: string;
}

export const signToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: "7d",
    });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export async function getGoogleProfilePhoto(senderEmail: string, accessToken: string): Promise<string | null> {
  const people = google.people({ version: 'v1', auth: accessToken });
  try {
    // Search for the contact by email
    const res = await people.people.searchContacts({
      query: senderEmail,
      readMask: 'photos',
      pageSize: 1,
    });
    const person = res.data.results?.[0]?.person;
    const photo = person?.photos?.find(p => p.url && p.default);
    return photo?.url || null;
  } catch (error) {
    console.error('Failed to fetch Google profile photo:', error);
    return null;
  }
}