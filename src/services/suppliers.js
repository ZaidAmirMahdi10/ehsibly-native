import apiClient from './apiClient';

export const getSuppliers = async (params = {}) => {
  const response = await apiClient.get('/getSuppliers', {params});
  return response.data;
};

// POST /createSupplier — minimal required fields are supplierName +
// organizationId + userId; everything else (including bankAccounts) is
// optional server-side, but a supplier with no bank account can't be used
// to create an invoice yet (the invoice form needs a currency sourced from
// one), so callers should supply at least one bank account when possible.
export const createSupplier = async payload => {
  const response = await apiClient.post('/createSupplier', payload);
  return response.data;
};
