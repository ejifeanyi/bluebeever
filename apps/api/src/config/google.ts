import { google } from 'googleapis';
import { env } from './env';
import { GMAIL_SCOPES } from '@crate/shared';

export const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

export const getAuthUrl = () => {
  console.log("Google redirect URI: ", env.GOOGLE_REDIRECT_URI);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [...GMAIL_SCOPES],
    prompt: 'consent',
  });
};

export const getGmailClient = (accessToken: string) => {
  const client = new google.auth.OAuth2();
  client.setCredentials({ access_token: accessToken });
  
  return google.gmail({ version: 'v1', auth: client });
};