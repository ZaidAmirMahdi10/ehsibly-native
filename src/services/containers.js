import apiClient from './apiClient';
import {ymdToISO} from '../utils/format';

// Shipped containers (no-customer flow). Endpoints mirror the web app's
// NoCustomerContainers / ViewNoCustomerContainer / AddFullNoCustomerContainer.

// GET /getShippedContainersWithoutC — `supplier-id: All` is the sentinel for
// "every supplier" (without it the backend falls back to the user's
// currentSupplierId and returns nothing when unset). omitUserIdHeader for the
// same reason as the invoices list: a bare organization login has no user id,
// and the literal 'NaN' header would make the backend crash on a later
// `prisma.user.update({where: {id: NaN}})`.
export const getContainers = async ({page = 1, limit = 20, search = '', subCompanyId} = {}) => {
  const params = {page, limit};
  if (subCompanyId) {
    params.subCompanyId = subCompanyId;
  }
  if (search) {
    params.type = 'containerNumber';
    params.query = search;
  }
  const response = await apiClient.get('/getShippedContainersWithoutC', {
    params,
    headers: {'supplier-id': 'All'},
    omitUserIdHeader: true,
  });
  return response.data;
};

// GET /getShippedContainer/:id → { shippedContainer }
export const getContainer = async id => {
  const response = await apiClient.get(`/getShippedContainer/${id}`);
  return response.data?.shippedContainer;
};

// POST /createMultiContainersInvoiceWithoutC with NO invoiceNumber — the same
// call the web's AddFullNoCustomerContainer makes: the backend then skips
// creating an invoice and just creates the (invoice-less) container.
// `delivered` must be an object ({value}) — the route reads `delivered?.value`.
export const createContainer = async ({supplierId, subCompanyId, organizationId, createdBy, container}) => {
  const {delivered, ...rest} = container;
  [
    'expectedArrivalDate',
    'exitDate',
    'dateOfEntry',
    'shippingDate',
    'permitsReceivingDate',
  ].forEach(key => {
    rest[key] = ymdToISO(rest[key]);
  });
  const response = await apiClient.post('/createMultiContainersInvoiceWithoutC', {
    supplierId,
    subCompanyId,
    organizationId,
    createdBy,
    containers: [{...rest, delivered: {value: !!delivered}}],
  });
  return response.data?.containers?.[0];
};

// PUT /updateShippedContainerWithoutC — body field names copied from the web's
// ViewNoCustomerContainer. Numeric fields must always be real numbers: the
// route runs parseFloat() on them and NaN (from undefined/null) would fail.
export const updateContainer = async (id, c) => {
  const response = await apiClient.put('/updateShippedContainerWithoutC', {
    shippedContainerId: id,
    containerNumber: c.containerNumber,
    expectedArrivalDate: ymdToISO(c.expectedArrivalDate),
    finalDestination: c.finalDestination || null,
    shipper: c.shipper || null,
    material: c.material || null,
    numberOfBoxes: Number(c.numberOfBoxes) || 0,
    measuringUnit: c.measuringUnit || null,
    unitPrice: Number(c.unitPrice) || 0,
    exitDate: ymdToISO(c.exitDate),
    dateOfEntry: ymdToISO(c.dateOfEntry),
    shippingDate: ymdToISO(c.shippingDate),
    permitsReceivingDate: ymdToISO(c.permitsReceivingDate),
    notes: c.notes || null,
    amountForSupplier: Number(c.amountForSupplier) || 0,
    abstractAmountForCustomer: Number(c.abstractAmountForCustomer) || 0,
    finalAmountForCustomer: Number(c.finalAmountForCustomer) || 0,
    delivered: !!c.delivered,
    updateCounter: Number(c.updateCounter) || 0,
  });
  return response.data?.updatedShippedContainer;
};

// DELETE /archiveShippedContainer/:id
export const archiveContainer = async id => {
  const response = await apiClient.delete(`/archiveShippedContainer/${id}`);
  return response.data;
};
