require('dotenv').config();

const express = require('express');
const request = require('request-promise-native');
const NodeCache = require('node-cache');
const session = require('express-session');
const open = require('open');

const app = express();
const PORT = 3000;

/* =========================================================
   ENVIRONMENT VARIABLES
========================================================= */

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error('Missing CLIENT_ID or CLIENT_SECRET in .env file');
}

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

/* =========================================================
   TOKEN STORAGE (IN-MEMORY)
========================================================= */

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

/* =========================================================
   HUBSPOT OAUTH CONFIGURATION
========================================================= */

let SCOPES = "crm.objects.companies.read crm.objects.companies.write";
if (process.env.SCOPE) {
  SCOPES = process.env.SCOPE;
}

const REDIRECT_URI = `http://localhost:${PORT}/oauth-callback`;

const authUrl =
  'https://app.hubspot.com/oauth/authorize' +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

/* =========================================================
   SESSION CONFIGURATION
========================================================= */

app.use(
  session({
    secret: Math.random().toString(36).substring(2),
    resave: false,
    saveUninitialized: true,
  })
);

/* =========================================================
   ROUTES
========================================================= */

// Home
app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write('<h2>HubSpot OAuth 2.0 App</h2>');

  if (isAuthorized(req.sessionID)) {
    const accessToken = await getAccessToken(req.sessionID);
    res.write('<p>✅ OAuth successful</p>');
    res.write('<p>Access token obtained</p>');
    res.write(`<p><strong>Access Token:</strong> ${accessToken}</p>`);
  } else {
    res.write('<a href="/install"><h3>Install the app</h3></a>');
  }

  res.end();
});

// Step 1: Redirect user to HubSpot OAuth consent page
app.get('/install', (req, res) => {
  console.log('Redirecting user to HubSpot OAuth consent page');
  res.redirect(authUrl);
});

// Step 2–4: Handle OAuth callback and exchange code for tokens
app.get('/oauth-callback', async (req, res) => {
  if (!req.query.code) {
    return res.redirect('/error?msg=Missing authorization code');
  }

  const authCodeProof = {
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code: req.query.code,
  };

  const tokenResponse = await exchangeForTokens(
    req.sessionID,
    authCodeProof
  );

  if (tokenResponse.error) {
    return res.redirect(`/error?msg=${tokenResponse.message}`);
  }

  res.redirect('/');
});

// Error page
app.get('/error', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h4>Error: ${req.query.msg}</h4>`);
  res.end();
});

/* =========================================================
   TOKEN HELPERS
========================================================= */

const exchangeForTokens = async (userId, exchangeProof) => {
  try {
    const response = await request.post(
      'https://api.hubapi.com/oauth/v3/token',
      { form: exchangeProof }
    );

    const tokens = JSON.parse(response);

    refreshTokenStore[userId] = tokens.refresh_token;
    accessTokenCache.set(
      userId,
      tokens.access_token,
      Math.round(tokens.expires_in * 0.75)
    );

    console.log('Access token and refresh token received');
    return tokens;
  } catch (error) {
    console.error('Token exchange failed');
    return JSON.parse(error.response.body);
  }
};

const refreshAccessToken = async (userId) => {
  const refreshTokenProof = {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    refresh_token: refreshTokenStore[userId],
  };

  return await exchangeForTokens(userId, refreshTokenProof);
};

const getAccessToken = async (userId) => {
  if (!accessTokenCache.get(userId)) {
    await refreshAccessToken(userId);
  }
  return accessTokenCache.get(userId);
};

const isAuthorized = (userId) => {
  return !!refreshTokenStore[userId];
};

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(`OAuth app running at http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
});