import apiClient from './apiClient';

// POST /generatePermit — builds the bank's transfer-request document package
// server-side and, as a side effect, creates/updates the invoice's
// MultiCInvoicePaymentDetails row (this is what makes the invoice show up
// with an "application" at all). Response is a document ZIP blob; on mobile
// we don't attempt to save/open it (no file-system dependency installed —
// see the write-flow scope note), we just care about the side effect.
//
// Deliberately NOT using responseType: 'arraybuffer' here — React Native's
// networking layer has known unreliability with binary responseTypes (the
// request can resolve without the server-side write actually completing,
// confirmed by comparing this exact call against a plain curl POST, which
// creates the payment row every time while the arraybuffer version
// intermittently didn't). Since the ZIP body is discarded either way, the
// default text/json handling is what we want.
export const generatePermit = async payload => {
  const response = await apiClient.post('/generatePermit', payload);
  return response;
};
