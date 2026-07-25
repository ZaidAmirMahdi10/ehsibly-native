import axios from 'axios';
import {API_BASE_URL} from '../config/env';

// Kept as an in-memory, synchronously-readable cache so the request
// interceptor never has to `await AsyncStorage` per call (which would race
// with fast successive requests). AuthContext is the single writer, via
// setApiSession/clearApiSession, kept in sync with AsyncStorage.
let currentSession = null;
let onUnauthorized = null;

export const setApiSession = session => {
  currentSession = session;
};

export const clearApiSession = () => {
  currentSession = null;
};

// AuthContext registers itself here at boot so the response interceptor
// (which lives outside the React tree) can trigger a logout on 401 without
// a component import cycle.
export const registerUnauthorizedHandler = handler => {
  onUnauthorized = handler;
};

// Mirrors the request interceptor below — for callers that need these
// headers outside of an axios request (e.g. WebView's `source.headers`,
// which has no interceptor of its own).
export const getAuthHeaders = () => {
  const headers = {};
  if (currentSession?.token) {
    headers.Authorization = `Bearer ${currentSession.token}`;
    headers['user-id'] = currentSession.userId ?? 'NaN';
  }
  if (currentSession?.organization?.id) {
    headers.organizationId = currentSession.organization.id;
    headers['organization-id'] = currentSession.organization.id;
  }
  return headers;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(config => {
  if (currentSession?.token) {
    config.headers.Authorization = `Bearer ${currentSession.token}`;
  }
  // The backend is inconsistent about tenant-identity header naming across
  // routes — some read `organizationId`, others `organization-id` (a
  // genuinely different header, HTTP names aren't hyphen-insensitive), and
  // several endpoints (e.g. /getSuppliers) have no auth middleware at all
  // and instead do an ad-hoc `if (!req.headers['user-id']) return 401`
  // check. Sending all three defensively avoids chasing this route-by-route.
  if (currentSession?.organization?.id) {
    config.headers.organizationId = currentSession.organization.id;
    config.headers['organization-id'] = currentSession.organization.id;
  }
  // Some routes (e.g. /getSuppliers) have no real auth middleware and
  // instead do `if (!req.headers['user-id']) return 401` — for a bare
  // "organization" login there is no individual user id (session.userId is
  // null), but the header must still be PRESENT or that check trips and
  // logs the whole app out. The real web app hits this exact gap and papers
  // over it by sending the literal string "NaN" (parseInt(null) in its own
  // code) — matching that here, since the backend's downstream `isNaN(userId)`
  // fallback to organizationId already accounts for it.
  //
  // `omitUserIdHeader: true` opts a request OUT of this entirely — needed by
  // bank-wide endpoints (getBankMultiContainersInvoices) whose controller
  // treats a *present* user-id header as "scope results to just this one
  // person's own creator/auditor/executor assignments". The reference web
  // app only ever sends that header when its own explicit "my transactions"
  // toggle is on, and sends null otherwise; this app has no such toggle, so
  // every request was unintentionally personal-scoped — empty for any staff
  // account with nothing assigned to them yet, and a hard 500 for a bare
  // "organization"/bank login (session.userId is null → header 'NaN' →
  // truthy → the backend parses it to NaN and crashes on a later
  // `prisma.user.update({where: {id: NaN}})`).
  if (currentSession?.token && !config.omitUserIdHeader) {
    config.headers['user-id'] = currentSession.userId ?? 'NaN';
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      clearApiSession();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
