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
  const response = await apiClient.post('/createSupplier', payload, {
    skipUnauthorizedLogout: true,
  });
  return response.data;
};

// PUT /updateSupplier/:id — updates a supplier's own fields (name, company,
// contact, etc.). Bank accounts are managed separately.
export const updateSupplier = async (id, payload) => {
  const response = await apiClient.put(`/updateSupplier/${id}`, payload);
  return response.data;
};

// POST /supplier/addSupplierFiles?id=<supplierId> — the only supplier
// document endpoint, and it's a full sync (like the invoice one): every
// supplier document whose name is not listed in `existingFiles` (or uploaded
// in the same request) is deleted. So deleting ONE document means re-sending
// the names of all the others as keep-markers and uploading nothing.
export const deleteSupplierDocument = async (supplierId, docName, allDocNames) => {
  const formData = new FormData();
  allDocNames
    .filter(name => name !== docName)
    .forEach(name => formData.append('existingFiles', name));
  const response = await apiClient.post('/supplier/addSupplierFiles', formData, {
    params: {id: supplierId},
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return response.data;
};

// Same endpoint as deleteSupplierDocument, uploading one file. `docName` must
// be one of the multer field names the route accepts (supplierCertificate /
// articleOfAssociation); a file with the name of an existing document
// replaces it, and every other existing document is kept via `existingFiles`.
export const uploadSupplierDocument = async (supplierId, docName, file, allDocNames) => {
  const formData = new FormData();
  formData.append(docName, file);
  allDocNames
    .filter(name => name !== docName)
    .forEach(name => formData.append('existingFiles', name));
  const response = await apiClient.post('/supplier/addSupplierFiles', formData, {
    params: {id: supplierId},
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return response.data;
};

// GET /supplier/byId/:id — the full supplier row; `documents` is the list of
// its uploaded files ({id, name, ...}, name = supplierCertificate /
// articleOfAssociation).
export const getSupplierDocuments = async supplierId => {
  const response = await apiClient.get(`/supplier/byId/${supplierId}`);
  return response.data?.documents || [];
};

// Step 2 of the web's "add supplier": uploads the supplier certificate and the
// articles of association in one request (multer field names are
// supplierCertificate / articleOfAssociation).
export const uploadSupplierFiles = async (supplierId, files) => {
  const formData = new FormData();
  Object.entries(files).forEach(([field, file]) => {
    if (file) {
      formData.append(field, {
        uri: file.uri,
        name: file.name || `${field}.pdf`,
        type: file.type || 'application/pdf',
      });
    }
  });
  const response = await apiClient.post('/supplier/addSupplierFiles', formData, {
    params: {id: supplierId},
    headers: {'Content-Type': 'multipart/form-data'},
    // RN never settles a request whose file can't be read — don't hang the form.
    timeout: 30000,
  });
  return response.data;
};
