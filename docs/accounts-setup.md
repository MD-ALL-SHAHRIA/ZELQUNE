# Setting up email, Google and Facebook sign-in

Nothing here costs money. Only the owner can create these accounts. Put every value in
`infra/.env` (never in Git), then restart: `pnpm infra:up`.

## Email (needed before launch)
In development every email goes to Mailpit: open http://localhost:8025 to read them.
For the live site, pick a provider (for example Resend, Brevo or Zoho Mail), verify the domain
`zelqune.com` there (it gives you SPF, DKIM and DMARC records to add at your domain registrar),
then set:

```
EMAIL_DRIVER=smtp
SMTP_HOST=<from the provider>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<from the provider>
SMTP_PASS=<from the provider>
MAIL_FROM=Zelqune <hello@zelqune.com>
STOREFRONT_URL=https://zelqune.com
PUBLIC_API_URL=https://api.zelqune.com
```

## Google
1. Go to https://console.cloud.google.com, create a project "Zelqune".
2. APIs & Services > OAuth consent screen: External; app name Zelqune; support email; add the
   privacy policy link `https://zelqune.com/en/privacy`; scopes: email, profile, openid.
3. Credentials > Create credentials > OAuth client ID > Web application.
   - Authorised redirect URI: `https://api.zelqune.com/v1/auth/oauth/google/callback`
     (for local testing also `http://localhost:3000/v1/auth/oauth/google/callback`).
4. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Publish the consent screen when the site is live.

## Facebook
1. Go to https://developers.facebook.com, My Apps > Create app > "Authenticate and request data
   from users with Facebook Login".
2. Facebook Login > Settings: Valid OAuth Redirect URIs:
   `https://api.zelqune.com/v1/auth/oauth/facebook/callback`
3. App settings > Basic: add the privacy policy URL and a data deletion instructions URL
   (`https://zelqune.com/en/privacy-request`).
4. Copy the App ID and App Secret into `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`.
5. Meta asks for business verification before the public can use it ("Live" mode).

The Google and Facebook buttons appear on the sign-in page automatically once the keys are set.
