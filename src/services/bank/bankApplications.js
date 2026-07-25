import apiClient from '../apiClient';

const route = 'bankAndSubcompany';

// Confirmed against ehsibly-frontend/src/pages/banks/BanksInvoicesApplications.js.
// Access is scoped per bank-staff user via their assigned sub-companies —
// omitting creatorUserId (or leaving it undefined) restricts results to the
// CALLING user's own sub-companies, which is empty for most bank staff and
// reads as "no data" for what's meant to be an org-wide dashboard. Passing
// 'All' explicitly is required to see every application in the organization.
export const getBankApplications = async ({signal, ...params} = {}) => {
  const response = await apiClient.get(
    `${route}/getBankMultiContainersInvoices`,
    {params: {creatorUserId: 'All', ...params}, signal},
  );
  return response.data;
};

// Payment history for one invoice — lazy-fetched, matches the web
// dashboard's expand-a-row behavior.
export const getBankApplicationPayments = async invoiceId => {
  const response = await apiClient.get(`${route}/getAll/${invoiceId}`);
  return response.data;
};

// Options for the advanced filter panel's sender (sub-company) dropdown —
// same endpoint the web dashboard's CompanySupplierFilter uses. Note
// organizationName is a required QUERY param on this route; the
// organizationId header apiClient already attaches isn't consulted here.
export const getBankSubCompanies = async ({search = '', organizationName, limit = 50} = {}) => {
  const response = await apiClient.get('api/subCompany/forBank/byName', {
    params: {page: 1, limit, search, organizationName},
  });
  return response.data;
};

// Options for the receiver (supplier) dropdown — web parity: supplierByBank
// returns the suppliers reachable from this bank's applications.
export const getBankSuppliers = async ({search = '', limit = 50} = {}) => {
  const response = await apiClient.get('supplier/supplierByBank', {
    params: {page: 1, limit, search},
  });
  return response.data;
};
