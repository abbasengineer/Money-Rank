# Render Environment Variables Setup

## Required Environment Variables

### For SEO and Meta Tags

#### BASE_URL (Recommended)
```
https://moneyrank.onrender.com
```
**Purpose**: Ensures all Open Graph images, canonical URLs, and meta tags use the correct absolute URLs for proper SEO and social sharing.

**Why it's important**: Without this, social media previews may show broken images and canonical URLs may be incorrect.

---

### For Facebook OAuth

Add these three environment variables to your Render service:

### 1. FACEBOOK_APP_ID
```
663958490040540
```

### 2. FACEBOOK_APP_SECRET
```
6375b61b22e0b284b5828c9c87bf53ee
```

### 3. FACEBOOK_CALLBACK_URL
```
https://moneyrank.onrender.com/api/auth/facebook/callback
```

## Steps to Add in Render Dashboard

1. Go to https://dashboard.render.com/
2. Click on your **MoneyRank** service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable** for each variable above
5. **Important**: Add `BASE_URL` first for proper SEO
6. After adding all variables, Render will automatically redeploy (or you can manually redeploy)

## Verification

After deployment, test the Facebook login:
1. Go to https://moneyrank.onrender.com
2. Click "Sign in"
3. Click "Quick Sign In" tab
4. Click "Continue with Facebook"
5. Should redirect to Facebook for authentication

## Notes

- Make sure your Facebook app is in **Live Mode** (not Development Mode) for production
- The callback URL in Facebook settings must match: `https://moneyrank.onrender.com/api/auth/facebook/callback`

