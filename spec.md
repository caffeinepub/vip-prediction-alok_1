# VIP Prediction Alok

## Current State
- Login page with password `SURESHOTALOK` (5-day session)
- Prediction page with 1-min WinGo-style timer and period number
- Prediction reveals BIG/SMALL 15 seconds before end
- Download prediction as PNG screenshot
- Telegram CTA box at bottom
- No admin panel

## Requested Changes (Diff)

### Add
- **APK download button**: A prominent button on PredictionPage (and possibly LoginPage) linking to a placeholder APK download URL (user will replace later). Shows an Android download icon.
- **Welcome sound**: Play a short welcome/notification sound when the app first loads (on LoginPage mount).
- **Header subtitle text**: Below the main title, add the text "WINGO 1-MIN RESULT TRACKING Analysis 🎯 DIRECT ANSWER:100% SURESHOT Big - Small prediction" prominently on PredictionPage header.
- **Register link**: Add a "REGISTER" button/link pointing to https://www.hyderabad91.com/#/register?invitationCode=4841620269921 — visible on both LoginPage and PredictionPage.
- **Left-aligned layout**: Shift main content alignment to the left side of the screen instead of centered.
- **Betting history panel**: At the bottom of PredictionPage, show last N results as WIN/LOSS history with period numbers and outcome labels.

### Modify
- **PredictionPage layout**: Left-align the main prediction card and stats instead of centering them.
- **Header**: Add the subtitle/tagline text below the VIP PREDICTION ALOK branding.

### Remove
- Nothing to remove.

## Implementation Plan
1. Add welcome sound effect using Web Audio API (generated tone) that plays on LoginPage mount.
2. Add APK download button on PredictionPage header area (placeholder link `#apk-download`).
3. Add Register link button on both LoginPage and PredictionPage pointing to hyderabad91.com register URL.
4. Update PredictionPage header to include the tagline "WINGO 1-MIN RESULT TRACKING Analysis 🎯 DIRECT ANSWER:100% SURESHOT Big - Small prediction".
5. Update PredictionPage layout to be left-aligned (use `items-start` / `justify-start` instead of center).
6. Add BettingHistory component at bottom of PredictionPage that stores last 10 period results (BIG/SMALL) in localStorage and shows them as WIN/LOSS rows.
