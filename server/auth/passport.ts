import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../storage';
import { eq, and } from 'drizzle-orm';
import { users } from '@shared/schema';
import { db } from '../db';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
const getCallbackURL = () => {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  const port = process.env.PORT || '3000';
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL || 'https://yourdomain.com'
    : `http://localhost:${port}`;
  return `${baseUrl}/api/auth/google/callback`;
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: getCallbackURL(),
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName || profile.name?.givenName || 'User';
        const avatar = profile.photos?.[0]?.value;

        // Check if user exists with this Google ID
        const [existingUser] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.authProvider, 'google'),
              eq(users.authProviderId, googleId)
            )
          )
          .limit(1);

        if (existingUser) {
          // Update user info in case it changed
          await db
            .update(users)
            .set({
              email: email || existingUser.email,
              displayName: displayName || existingUser.displayName,
              avatar: avatar || existingUser.avatar,
              emailVerified: email ? true : existingUser.emailVerified,
            })
            .where(eq(users.id, existingUser.id));
          
          return done(null, existingUser);
        }

        // Check if user exists with this email (for account linking)
        if (email) {
          const [emailUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (emailUser) {
            // Link Google account to existing user
            await db
              .update(users)
              .set({
                authProvider: 'google',
                authProviderId: googleId,
                displayName: displayName || emailUser.displayName,
                avatar: avatar || emailUser.avatar,
                emailVerified: true,
              })
              .where(eq(users.id, emailUser.id));

            const [updatedUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, emailUser.id))
              .limit(1);

            return done(null, updatedUser!);
          }
        }

        // Create new user
        const newUser = await storage.createUser({
          email: email || undefined,
          emailVerified: !!email,
          displayName: displayName,
          avatar: avatar || undefined,
          authProvider: 'google',
          authProviderId: googleId,
        });

        return done(null, newUser);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;

