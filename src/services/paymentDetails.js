import apiClient from './apiClient';

export const getPaymentDetail = async paymentId => {
  const response = await apiClient.get(`/multiCInvoicePaymentDetails/${paymentId}`);
  return response.data;
};

// PATCH /multiCInvoicePaymentDetails/updateStatus/:id — the real "Send to
// Bank" action confirmed live against the web app: a plain status write
// (status: "NOT_STARTED"), not an email. Do not call any /sendPDF/email
// endpoint for this — that's an unrelated sub-flow (forwarding docs to the
// customs/currency-auction department), confirmed by comparing the status
// each one actually writes.
export const updateInvoicePaymentStatus = async (paymentId, body) => {
  const response = await apiClient.patch(
    `/multiCInvoicePaymentDetails/updateStatus/${paymentId}`,
    body,
  );
  return response.data;
};

// PUT /multiCInvoicePaymentDetails/:id — full sync of this payment's
// MCIPaymentDocs: any of the 9 known field names NOT present in the request
// (as either a file or an empty-string "keep" marker) gets deleted
// server-side. `invoiceId` must be on the query string (not just the body) —
// the backend's S3 key builder reads it from req.query specifically.
export const updatePaymentDocuments = async (paymentId, invoiceId, formData) => {
  const response = await apiClient.put(
    `/multiCInvoicePaymentDetails/${paymentId}`,
    formData,
    {
      params: {invoiceId},
      headers: {'Content-Type': 'multipart/form-data'},
    },
  );
  return response.data;
};
