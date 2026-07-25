import apiClient from './apiClient';

export const getFilteredSubCompanies = async (params = {}) => {
  const response = await apiClient.get('/api/subCompany/filtered', {params});
  return response.data;
};

// POST /api/subCompany — only companyName + organizationId are required.
export const createSubCompany = async payload => {
  const response = await apiClient.post('/api/subCompany', payload);
  return response.data;
};
