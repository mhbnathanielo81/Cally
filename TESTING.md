# Testing Cally

There are two ways to test Cally: **unit/component tests** (no Firebase needed) and **running the full app** with the Firebase Emulator Suite.

---

## 1. Unit & Component Tests

No Firebase account or credentials needed.

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### What's tested

| Test file | What it covers |
|---|---|
| `src/__tests__/colors.test.ts` | `getEventColor()` logic — which color is assigned based on creator / type |
| `src/__tests__/CalendarGrid.test.tsx` | Renders correct days, event pills, "+N more", click callbacks |
| `src/__tests__/MonthSidebar.test.tsx` | Month buttons, year dropdown, change callbacks |
| `src/__tests__/ErrorBoundary.test.tsx` | Catches thrown errors, shows fallback UI |

---

## 2. Full App — Firebase Emulator Suite

This runs the real Next.js app connected to **local** Firebase emulators, so nothing touches a real Firebase project.

### Prerequisites

```bash
# Install Firebase CLI globally (once)
npm install -g firebase-tools

# Log in (needed for emulators)
firebase login
```

### Step 1 — Create your local `.env.local`

```bash
cp .env.local.example .env.local
```

The example file already has placeholder values and `NEXT_PUBLIC_USE_EMULATORS=true`, so no edits are needed for local testing.

### Step 2 — Start the Firebase Emulators

In a terminal:

```bash
firebase emulators:start --project demo-cally
```

This starts:
| Emulator | Port |
|---|---|
| Auth | 9099 |
| Firestore | 8080 |
| Functions | 5001 |
| Emulator UI | 4000 |

### Step 3 — Start the Next.js dev server

In a second terminal:

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

### Step 4 — Sign in

Because the Auth emulator is running, you can sign in with Google using a **fake test account** — the emulator presents its own sign-in page. No real Google account required.

> **Tip:** The Emulator UI at http://localhost:4000 lets you browse Firestore data, view auth users, and trigger functions in real-time.

---

## 3. Full App — Real Firebase Project

To test against a real Firebase project:

1. Create a project at https://console.firebase.google.com  
2. Enable **Google Sign-In** under Authentication  
3. Create a **Firestore database**  
4. Enable **Cloud Messaging** (for push notifications)  
5. Copy your project's config into `.env.local` (see `.env.local.example` for all required keys)  
6. Set `NEXT_PUBLIC_USE_EMULATORS=false`  
7. Deploy Firestore rules: `firebase deploy --only firestore:rules,firestore:indexes`  
8. Run `npm run dev`

---

## Build Verification

To verify the production build compiles without errors:

```bash
npm run build
```

All 5 routes (/, /calendar, /settings, /404, /_app) should build with no TypeScript or lint errors.
