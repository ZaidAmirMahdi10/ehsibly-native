# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ehsibly — a React Native 0.78 (New Architecture, plain JS, not Expo) mobile client for the Ehsibly platform. It is the native counterpart of a web frontend and a Node/Prisma backend that live in sibling repos (`../ehsibly-frontend`, `../ehsibly-backend`). Screens, labels, validation rules and payload shapes are intentionally kept **identical to the web app**; when asked to "match the web", read the corresponding web page/component (e.g. `ehsibly-frontend/src/pages/...`) and the backend controller before changing anything.

## Commands

```sh
yarn install            # runs patch-package (patches/react-native-config)
yarn start              # Metro (port 8081)
yarn ios                # needs `bundle install && bundle exec pod install` in ios/ after native dep changes
yarn android
yarn lint               # eslint . (prettier via .prettierrc.js)
yarn test               # jest (only __tests__/App.test.tsx exists)
yarn jest path/to/file  # single test file
```

Yarn uses `nodeLinker: node-modules` (`.yarnrc.yml`). iOS bundle id is `com.ehsibly.app`.

## Environment

`react-native-config` reads `API_BASE_URL` from `.env` (`src/config/env.js` throws at startup if it's missing). `.env` is git-ignored; `.env.example` lists the three targets (production, local backend `http://localhost:3005`, test). On the Android emulator the host machine is `10.0.2.2`. Changing `.env` requires restarting Metro/rebuilding.

## Architecture

- **Entry / providers** — `App.js` wraps the app in `LanguageContext` (custom context exported from `App.js`, consumed everywhere via `useContext(LanguageContext)` for `currentDirection`/`changeLanguage`), `AuthProvider`, `AlertProvider`, and a `NavigationContainer`. Languages: `ar` (default + fallback), `ckb` (Sorani Kurdish), `en`. `ar` and `ckb` are RTL — layouts must handle `isRTL` explicitly (`flexDirection: isRTL ? 'row-reverse' : 'row'`).
- **Navigation** — `src/navigation/RootNavigator.js` is a single JS stack (`@react-navigation/stack`, deliberately *not* native-stack: `react-native-screens` crashed on this RN/New-Arch setup) with conditional screens for the auth flow. `AppTabs.js` picks the tab set by `session.organization.organizationType`: merchant types get the organization screens (`src/screens/organization`), `BANK` gets `src/screens/bank`; other types land on `UnsupportedOrgTypeScreen`. Pickers use a callback-in-route-params pattern (`navigate('BankPicker', {onSelect})`, `onCreated`, `onSaved`) instead of shared state.
- **Auth/session** — `src/context/AuthContext.js` normalizes the different `/login` response shapes (`organization`, `orgUser`, …) into one session object persisted in AsyncStorage under `ehsibly_session`. A bare `organization` login has `userId: null`.
- **API layer** — `src/services/apiClient.js` is the single axios instance. It keeps the session in a module-level cache and injects `Authorization`, `organizationId`, `organization-id` and `user-id` (literal `'NaN'` when there is no user id — mirrors the web, needed by routes that only check header presence). Request flags: `omitUserIdHeader` (bank-wide endpoints that would otherwise scope to one user) and `skipUnauthorizedLogout` (endpoints that return 401 for validation, e.g. `/createSupplier` without a userId). **Any other 401 clears the session and logs the user out.** Service modules in `src/services/` are thin wrappers per backend route group.
- **Shared form components** — `src/components/` (`FormField`, `SelectField`, `DatePickerField`, `PrimaryButton`, `ErrorBox`/`InfoBox`, …) and `src/constants/theme.js` (`COLORS`; `COLORS.bg` is intentionally white). Complex sections reused across screens: `SubCompanyBankAccounts` (supplier = foreign banks, sub-company = Iraqi banks) and `SubCompanyAdditionalInfo`.
- **Translations** — `src/locales/{ar,en,ckb}.json`, flat keys, many copied verbatim from the web's locale files (same key names). Missing keys in `ckb` fall back to Arabic. When adding keys, add at least `ar` and `en`. Re-serializing these JSON files with a script reformats them (blank lines dropped) — prefer targeted edits.

## Gotchas

- **Picked files**: `@react-native-documents/picker` returns a temporary iOS inbox URI that can be deleted before an upload that happens later. Call `keepLocalCopy({destination: 'cachesDirectory'})` right after `pick()` when the upload isn't immediate, and give upload requests a `timeout` — React Native never settles a request whose file body can't be read, which leaves a spinner forever.
- **Backend contracts are sometimes odd** — e.g. bank accounts sent to `/createSupplier` / `/api/subCompany` need `bank.name` and `branch.address` (not just ids), the additional-signatory field is spelled `addtionalAuthSignatory`, and sub-company edit sends `compSupAdditionalInfo` while create sends `additionalInfo`. Check the controller in `../ehsibly-backend/controllers` when a request fails.
- **Bank transaction gating** — editing / resending follows the web rules: allowed while the payment's `companyPaymentStatus` is `NOT_SENT`/`REJECTED` or the application was returned (`bankStatus`/`companyStatus === 'REJECTED'`); read-only once sent to the bank or completed. Rejection reasons are shown only while the transaction is "incomplete".
- `HomeScreenOld.js`, `BankHomeScreenOld.js` and `i18n copy.js` are reference leftovers, not used by the app.
- The local backend (`http://localhost:3005`) validates org subscriptions: creating a sub-company fails with "Invalid subscription type" if the organization's `subscriptionType` has no matching `Subscription` row name prefix.
