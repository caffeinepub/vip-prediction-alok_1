# VIP Prediction Alok

## Current State
Website has multiple input boxes (3-digit + 2-digit), various panels, welcome animation, APK download, betting history, etc. from previous versions.

## Requested Changes (Diff)

### Add
- Only 2 input boxes for "Last 2 Numbers" entry (0-9 each)
- When 2 numbers entered, calculate result (0-9) and show BIG (5-9) or SMALL (0-4)
- Visitor list/counter display
- DEEPSEEK R1 AI Analysis Panel: full calculation, sureshot prediction, "ENTRY ALLOWED" or "RISK - NO ENTRY" status
- Login with password SURESHOTALOK (user session management)
- Telegram box with link: https://t.me/propredictiongowin (text: "Password chahiye to message karo")
- Register link box: https://www.hyderabad91.com/#/register?invitationCode=4841620269921
- WinGo 1-minute style countdown timer (period number)

### Modify
- Remove all previously added features EXCEPT visitor list
- Simplify to clean focused UI

### Remove
- 3-digit input box
- Welcome animation/matrix screen
- APK download button
- Betting history panel
- Nano AI panel (replace with DEEPSEEK R1 panel)
- Big/Small live prediction banner

## Implementation Plan
1. Backend: store visitor count, track logged-in sessions
2. Frontend login page: password entry, session with 5-day expiry
3. Main page after login:
   - WinGo 1-min countdown timer + period number at top
   - Two number input boxes (Last Number 1, Last Number 2, range 0-9)
   - Auto-calculate sum/result and show BIG/SMALL
   - DEEPSEEK R1 AI panel: probability analysis, streak detection, ENTRY ALLOWED / NO ENTRY status
   - Visitor counter
   - Telegram box (password help)
   - Register link box
