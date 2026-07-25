import apiClient from './apiClient';

// GET /api/bank — isIraqi:false lists foreign (beneficiary/supplier) banks,
// the ones relevant to a merchant setting up a supplier's bank account.
export const getForeignBanks = async (params = {}) => {
  const response = await apiClient.get('/api/bank', {
    params: {...params, isIraqi: false},
  });
  return response.data;
};

export const getIraqiBanks = async (params = {}) => {
  const response = await apiClient.get('/api/bank', {
    params: {...params, isIraqi: true},
  });
  return response.data;
};

// POST /api/bank — branches: [{branchName, branchAddress}], at least one
// valid branch required. Non-Iraqi banks must include organizationId.
export const createBank = async payload => {
  const response = await apiClient.post('/api/bank', payload);
  return response.data;
};
