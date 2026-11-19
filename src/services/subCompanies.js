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

// PUT /api/subCompany/:id — updates a sub-company's own fields.
export const updateSubCompany = async (id, payload) => {
  const response = await apiClient.put(`/api/subCompany/${id}`, payload);
  return response.data;
};

// POST /api/subCompany/addSubCompanyFiles?id=<id> — multipart; used for the
// final-accounts PDF (field name `finalAccounts`).
export const uploadSubCompanyDocuments = async (subCompanyId, formData) => {
  const response = await apiClient.post('/api/subCompany/addSubCompanyFiles', formData, {
    params: {id: subCompanyId},
    headers: {'Content-Type': 'multipart/form-data'},
    // React Native never settles a request whose file body can't be read
    // (e.g. the picked file was deleted), which left the form's button
    // spinning forever — a timeout turns that into a normal failure.
    timeout: 30000,
  });
  return response.data;
};

// GET /api/subCompany — the full records (bank accounts, additional info,
// extra signatories, documents), unlike /filtered which only has id + names.
export const getSubCompaniesDetailed = async (params = {}) => {
  const response = await apiClient.get('/api/subCompany', {params});
  return response.data;
};

// PATCH /api/subCompany/:bankAccountId — removes one bank account.
export const removeSubCompanyBankAccount = async bankAccountId => {
  const response = await apiClient.patch(`/api/subCompany/${bankAccountId}`, {});
  return response.data;
};
