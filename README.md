# Node.js OAuth 2.0 Quickstart

> **Note:** This app does not store any data persistently. Restarting the app will clear any retrieved access tokens.

---

## What the App Does

### Redirect to HubSpot's OAuth 2.0 Server

When you open your browser to `http://localhost:3000/install`, the app will redirect you to HubSpot's authorization page. Here, you can choose the account to install the app in and grant consent. After consent, HubSpot will redirect you back to the app.

### Exchange an Authorization Code for Access Tokens

The app will receive a temporary authorization code from HubSpot and exchange it for an **access token** and **refresh token**.

> **Note:** The OAuth v3 API requires parameters (`client_id`, `client_secret`, `code`, etc.) to be sent in the **request body as URL-encoded form data**, not as query parameters. This prevents sensitive data from appearing in server logs and improves security.


---

## Prerequisites

Before running the app, ensure you have:

1. **Node.js** (>=16 recommended)
2. **Yarn** (if using the included `yarn.lock` file)  
   Install with:
   ```bash
   npm install --global yarn
