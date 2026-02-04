import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
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

// Helper function to get callback URL
const getCallbackURL = (provider: 'google' | 'facebook') => {
  if (provider === 'google' && process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  if (provider === 'facebook' && process.env.FACEBOOK_CALLBACK_URL) {
    return process.env.FACEBOOK_CALLBACK_URL;
  }
  const port = process.env.PORT || '3000';
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL || 'https://yourdomain.com'
    : `http://localhost:${port}`;
  return `${baseUrl}/api/auth/${provider}/callback`;
};

// Google OAuth Strategy - Only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackURL('google'),
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
}

// Facebook OAuth Strategy - Only initialize if credentials are provided
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: getCallbackURL('facebook'),
        profileFields: ['id', 'displayName', 'email', 'picture.type(large)'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const facebookId = profile.id;
          let email = profile.emails?.[0]?.value;
          const displayName = profile.displayName || 'User';
          const avatar = profile.photos?.[0]?.value;

          console.log('[Facebook OAuth] Profile received:', {
            id: facebookId,
            displayName,
            hasEmailInProfile: !!email,
            emailFromProfile: email || 'none',
            hasAvatar: !!avatar,
          });

          // Check what permissions the access token actually has
          if (accessToken) {
            try {
              const permissionsUrl = `https://graph.facebook.com/me/permissions?access_token=${accessToken}`;
              const permissionsResponse = await fetch(permissionsUrl);
              const permissionsData = await permissionsResponse.json();
              console.log('[Facebook OAuth] Access token permissions:', JSON.stringify(permissionsData, null, 2));
              
              const emailPermission = permissionsData.data?.find((p: any) => p.permission === 'email');
              if (emailPermission) {
                console.log('[Facebook OAuth] Email permission status:', emailPermission.status);
                if (emailPermission.status !== 'granted') {
                  console.warn('[Facebook OAuth] ⚠️ Email permission was NOT granted! Status:', emailPermission.status);
                }
              } else {
                console.warn('[Facebook OAuth] ⚠️ Email permission not found in permissions list');
              }
            } catch (error) {
              console.warn('[Facebook OAuth] Could not check permissions:', error);
            }
          }

          // If email is not in profile, try to fetch it from Facebook Graph API
          if (!email && accessToken) {
            console.log('[Facebook OAuth] Email not in profile, attempting Graph API fetch...');
            try {
              const graphUrl = `https://graph.facebook.com/me?fields=email&access_token=${accessToken}`;
              console.log('[Facebook OAuth] Calling Graph API:', graphUrl.replace(accessToken, 'ACCESS_TOKEN_HIDDEN'));
              
              const response = await fetch(graphUrl);
              const data = await response.json();
              
              console.log('[Facebook OAuth] Graph API response status:', response.status);
              console.log('[Facebook OAuth] Graph API response data:', JSON.stringify(data, null, 2));
              
              if (response.ok && data.email) {
                email = data.email;
                console.log('[Facebook OAuth] ✅ Successfully fetched email from Graph API:', email);
              } else if (data.error) {
                console.error('[Facebook OAuth] ❌ Graph API error:', {
                  message: data.error.message,
                  type: data.error.type,
                  code: data.error.code,
                  error_subcode: data.error.error_subcode,
                });
              } else if (!data.email) {
                console.warn('[Facebook OAuth] ⚠️ Graph API returned no email field. Full response:', JSON.stringify(data, null, 2));
              }
            } catch (error) {
              console.error('[Facebook OAuth] ❌ Exception fetching email from Graph API:', error);
            }
          } else if (!accessToken) {
            console.warn('[Facebook OAuth] ⚠️ No access token available for Graph API call');
          }

          console.log('[Facebook OAuth] Final email value:', email || 'NONE');

          // Check if user exists with this Facebook ID
          const [existingUser] = await db
            .select()
            .from(users)
            .where(
              and(
                eq(users.authProvider, 'facebook'),
                eq(users.authProviderId, facebookId)
              )
            )
            .limit(1);

          if (existingUser) {
            console.log('[Facebook OAuth] Existing user found, updating...');
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
            
            // Fetch updated user to return latest data
            const [updatedUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, existingUser.id))
              .limit(1);
            
            console.log('[Facebook OAuth] User updated. Final email in DB:', updatedUser?.email || 'NONE');
            return done(null, updatedUser!);
          }

          // Check if user exists with this email (for account linking)
          if (email) {
            const [emailUser] = await db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1);

            if (emailUser) {
              console.log('[Facebook OAuth] Linking Facebook account to existing email user');
              // Link Facebook account to existing user
              await db
                .update(users)
                .set({
                  authProvider: 'facebook',
                  authProviderId: facebookId,
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
          console.log('[Facebook OAuth] Creating new user with email:', email || 'NONE');
          const newUser = await storage.createUser({
            email: email || undefined,
            emailVerified: !!email,
            displayName: displayName,
            avatar: avatar || undefined,
            authProvider: 'facebook',
            authProviderId: facebookId,
          });

          console.log('[Facebook OAuth] New user created. Email in DB:', newUser.email || 'NONE');
          return done(null, newUser);
        } catch (error) {
          console.error('[Facebook OAuth] ❌ Fatal error in OAuth callback:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );
} else {
  console.warn('⚠️  Facebook OAuth not configured - FACEBOOK_APP_ID or FACEBOOK_APP_SECRET missing');
}

// Email/Password Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email with email auth provider
        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.email, email),
              eq(users.authProvider, 'email')
            )
          )
          .limit(1);

        if (!user || !user.passwordHash) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;

