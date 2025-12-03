# dailyboard
# Daily Dashboard - API Setup Guide

A beautiful daily overview dashboard with real-time weather, Google Calendar integration, and task management.

---

## 🌤️ Weather API Setup (OpenWeatherMap)

### Step 1: Create Account
1. Go to [openweathermap.org](https://openweathermap.org/)
2. Click "Sign In" → "Create an Account"
3. Verify your email

### Step 2: Get API Key
1. After logging in, go to [API Keys](https://home.openweathermap.org/api_keys)
2. You'll see a default key, or create a new one
3. Copy the API key

### Step 3: Add to Dashboard
```javascript
const CONFIG = {
  WEATHER_API_KEY: '645ca30988c8625fecca9a816d901465',
  // ...
};
```

> ⚠️ **Note**: Free tier allows 1,000 API calls/day. New keys may take 10-30 minutes to activate.

---

## 📅 Google Calendar API Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it (e.g., "Daily Dashboard") and click "Create"

### Step 2: Enable Calendar API
1. In the sidebar, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

### Step 3: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** and click "Create"
3. Fill in required fields:
   - App name: "Daily Dashboard"
   - User support email: your email
   - Developer contact: your email
4. Click "Save and Continue"
5. On Scopes page, click "Add or Remove Scopes"
6. Find and select: `https://www.googleapis.com/auth/calendar.readonly`
7. Click "Save and Continue"
8. Add your email as a test user
9. Click "Save and Continue"

### Step 4: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Daily Dashboard Web Client"
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000` (for local development)
   - `http://localhost:5173` (if using Vite)
   - Your production domain (e.g., `https://yourdomain.com`)
6. Click **Create**
7. Copy the **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)

### Step 5: Add to Dashboard
```javascript
const CONFIG = {
  GOOGLE_CLIENT_ID: '643480272020-acncgudbscopt2ppoc70pk3qgme3lopb.apps.googleusercontent.com',
  // ...
};
```

---

## 🚀 Deployment Options

### Option 1: Vite + React (Recommended)

```bash
# Create new project
npm create vite@latest daily-dashboard -- --template react
cd daily-dashboard

# Replace src/App.jsx with the dashboard code
# Then run:
npm install
npm run dev
```

### Option 2: Create React App

```bash
npx create-react-app daily-dashboard
cd daily-dashboard

# Replace src/App.js with the dashboard code
npm start
```

### Option 3: Next.js

```bash
npx create-next-app@latest daily-dashboard
cd daily-dashboard

# Create pages/index.js with the dashboard code
# Add "use client" at the top for client-side rendering
npm run dev
```

---

## 🔒 Security Best Practices

### Environment Variables

Instead of hardcoding API keys, use environment variables:

**For Vite (.env file):**
```env
VITE_WEATHER_API_KEY=your_openweathermap_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

**In your code:**
```javascript
const CONFIG = {
  WEATHER_API_KEY: import.meta.env.VITE_WEATHER_API_KEY,
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
};
```

**For Create React App (.env file):**
```env
REACT_APP_WEATHER_API_KEY=your_openweathermap_key
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

**In your code:**
```javascript
const CONFIG = {
  WEATHER_API_KEY: process.env.REACT_APP_WEATHER_API_KEY,
  GOOGLE_CLIENT_ID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
};
```

> ⚠️ Never commit `.env` files to version control. Add `.env` to your `.gitignore`.

---

## 🛠️ Troubleshooting

### Weather Not Loading
- Check if API key is correct (no extra spaces)
- New API keys take 10-30 minutes to activate
- Check browser console for error messages
- Verify you haven't exceeded daily API limit

### Google Calendar "Access Blocked"
- Make sure your email is added as a test user
- Verify the OAuth consent screen is configured
- Check that Calendar API is enabled
- Ensure authorized origins include your domain

### Google Calendar "popup_closed_by_user"
- Allow popups for your domain
- Try a different browser
- Clear browser cache

### CORS Errors
- Make sure you're running on an authorized origin
- Check that the domain matches exactly (including http/https)

---

## 📱 Mobile Responsiveness

The dashboard is responsive by default. For better mobile experience, you can add this meta tag to your HTML:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## 🎨 Customization

### Change Default Location
```javascript
const CONFIG = {
  DEFAULT_CITY: 'New York',
  DEFAULT_COUNTRY: 'US',
};
```

### Change Color Theme
Find and modify these colors in the styles:
- Primary accent: `#4ECDC4` (teal)
- Secondary accent: `#FFE66D` (yellow)
- Error/delete: `#FF6B6B` (coral)

### Add More Calendar Colors
```javascript
const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#DDA0DD', '#87CEEB', '#98D8C8'];
```

---

## 📋 Features Overview

| Feature | API | Free Tier |
|---------|-----|-----------|
| Weather | OpenWeatherMap | 1,000 calls/day |
| Calendar | Google Calendar | Unlimited |
| To-Do | LocalStorage | Unlimited |
| Location | Browser Geolocation | Free |

---

## 🆘 Need Help?

- [OpenWeatherMap Documentation](https://openweathermap.org/api)
- [Google Calendar API Docs](https://developers.google.com/calendar/api)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)

Happy coding! 🚀
