import apiClient from '../apiClient';

const route = 'multiContainerInvoiceWithoutC';

export const getMultiContainerInvoices = async (params = {}) => {
  const response = await apiClient.get(
    `${route}/filteredMultiContainerInvoices`,
    {params},
  );
  return response.data;
};

// Backend reads the invoice id from a header, not a query/path param —
// confirmed against ehsibly-frontend/src/services/invoices/multiContainerWithoutC.js.
export const getInvoiceById = async invoiceId => {
  const response = await apiClient.get(
    `${route}/getMultiContainersInvoiceById`,
    {headers: {invoiceId}},
  );
  return response.data;
};

export const getInvoiceMainFiles = async invoiceId => {
  const response = await apiClient.get(`${route}/invoiceMainFiles/${invoiceId}`);
  return response.data;
};

// GET /getInvoiceFile/:docId — streams the file (S3 in production, local
// disk in dev) straight through the backend, auth-gated same as any other
// route. Works for docs from mCIDocs, MCIPaymentDocs, or the supplier
// `document` table — the controller checks all three by id. Not a
// presigned URL, so callers (the WebView-based viewer) must attach the
// same auth headers apiClient would.
export const getInvoiceFileUrl = docId =>
  `${apiClient.defaults.baseURL}/${route}/getInvoiceFile/${docId}`;

// PUT — full sync of this invoice's MCIDocs: any known doc-type field NOT
// present in the request (as either a file or an empty-string "keep" marker)
// gets deleted server-side. Confirmed against
// controllers/multiContainerInvoiceWithoutCContorller.js — this is not an
// additive "add one file" endpoint.
export const updateInvoiceMainFiles = async (invoiceId, formData) => {
  const response = await apiClient.put(
    `${route}/invoiceMainFiles/${invoiceId}`,
    formData,
    {headers: {'Content-Type': 'multipart/form-data'}},
  );
  return response.data;
};

// DELETE — removes a single mCIDocs row (and its S3 object) by id directly.
// Only covers invoice-level docs (mCIDocs) — there's no equivalent
// single-doc delete route for payment/bank-form docs (MCIPaymentDocs),
// only a delete-the-whole-payment-record one, so this can't be reused there.
export const deleteInvoiceDoc = async docId => {
  const response = await apiClient.delete(`${route}/invoiceMainFiles/${docId}`);
  return response.data;
};

// PUT — separate from the file upload above. Confirmed against the web
// app (ViewInvoice.js): after uploading a `customsDeclaration` file, it
// also calls this to persist the bayan/customs-declaration number
// ("01".."06") the user picked, which is stored directly on the invoice
// row (not as a doc).
export const setCustomsDeclarationNumber = async (invoiceId, customsDeclrationNumber) => {
  const response = await apiClient.put(
    `${route}/addCustomDelcrationNumber/${invoiceId}`,
    {customsDeclrationNumber},
  );
  return response.data;
};

// POST /createMultiContainersInvoiceWithoutC — body: { supplierId,
// subCompanyId, organizationId, createdBy, currency, invoiceNumber,
// amountForSupplier, date, notes, containers: [{ containerNumber, ... }] }.
export const createInvoice = async payload => {
  const response = await apiClient.post(
    '/createMultiContainersInvoiceWithoutC',
    payload,
  );
  return response.data;
};
