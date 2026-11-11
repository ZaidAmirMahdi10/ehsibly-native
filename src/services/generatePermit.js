import ReactNativeBlobUtil from 'react-native-blob-util';

import {API_BASE_URL} from '../config/env';
import {getAuthHeaders} from './apiClient';

// POST /generatePermit — builds the bank's transfer-request document package
// server-side (a ZIP containing the Word/Excel bank forms) and, as a side
// effect, creates/updates the invoice's MultiCInvoicePaymentDetails row (this
// is what makes the invoice show up with an "application" at all).
//
// Same behaviour as the web app: the ZIP is downloaded to the device.
//
// axios `responseType: 'arraybuffer'` is unreliable on React Native's
// networking layer for binary bodies (the request could resolve without the
// server-side write completing), so the request goes through
// react-native-blob-util instead, which streams the response body straight
// into a real file on disk — no JS-side binary handling at all.
//
// Resolves to {path, fileName} on success; rejects with an Error carrying
// `response.data.message` (axios-shaped) when the server answers non-2xx so
// the caller's existing error handling keeps working.
export const generatePermit = async (payload, fileName = 'documents.zip') => {
  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'documents.zip';
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${Date.now()}-${safeName}`;

  const res = await ReactNativeBlobUtil.config({path, fileCache: true}).fetch(
    'POST',
    `${API_BASE_URL}/generatePermit`,
    // Every header value MUST be a string: unlike axios, blob-util hands the
    // values straight to native, and a numeric one (organization-id / user-id
    // are numbers) aborts the iOS app with doesNotRecognizeSelector.
    Object.fromEntries(
      Object.entries({...getAuthHeaders(), 'Content-Type': 'application/json'})
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)]),
    ),
    JSON.stringify(payload),
  );

  const status = res.info().status;
  if (status < 200 || status >= 300) {
    let message;
    try {
      message = JSON.parse(await res.text())?.message;
    } catch (e) {
      // body wasn't JSON — fall through to the generic message
    }
    await ReactNativeBlobUtil.fs.unlink(path).catch(() => {});
    const error = new Error(message || `generatePermit failed (${status})`);
    error.response = {status, data: {message}};
    throw error;
  }

  return {path, fileName: safeName};
};
