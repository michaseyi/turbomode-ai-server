import { env } from '@/config/env';

export const jwtConfig = {
  secret: env.JWT_SECRET,
  accessToken: {
    expiresIn: env.JWT_EXPIRES_IN,
  },
  refreshToken: {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
};

export const googleAuthConfig = {
  clientID: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  callbackURL: env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email'],
};

export const authConfig = {
  jwt: jwtConfig,
  google: googleAuthConfig,
  cookies: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  session: {
    name: 'turbomode.sid',
    secret: env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
};
