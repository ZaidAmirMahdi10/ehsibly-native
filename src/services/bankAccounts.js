import apiClient from './apiClient';

// The backend returns 404 {"message":"No bank accounts found"} instead of
// 200 [] when a subCompany/supplier has no accounts yet — that's a normal,
// expected state here (not an error), so it's normalized to [].
const fetchBankAccounts = async params => {
  try {
    const response = await apiClient.get('/getBankAccounts', {params});
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      return [];
    }
    throw err;
  }
};

export const getCompanyBankAccounts = subCompanyId =>
  fetchBankAccounts({subCompanyId});

export const getSupplierBankAccounts = supplierId =>
  fetchBankAccounts({supplierId});
