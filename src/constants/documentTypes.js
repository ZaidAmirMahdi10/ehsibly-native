// Confirmed against ehsibly-backend's actual upload contracts (not a made-up
// list) — these are the exact multipart field names each PUT endpoint
// accepts, which double as the `type` stored on the resulting doc row.

// PUT multiContainerInvoiceWithoutC/invoiceMainFiles/:id (multer .any(), so
// technically accepts any field name, but these 5 are the real fixed set the
// web app uses for a standard invoice — multi-page `invoice-1`/`invoice-2`
// and custom `otherDoc_N` types are an advanced case not covered here).
export const INVOICE_DOC_TYPES = [
  'invoice',
  'customsDeclaration',
  'thirdPartyContract',
  'shippingPolicy',
  'exitPermit',
];

// Doc types that a GET invoiceMainFiles response merges in from OTHER
// tables (supplier KYC docs, and the payment's own BaghdadTransactionRequest)
// rather than from this invoice's own MCIDocs rows. The upload PUT above is a
// full sync of MCIDocs — these must never be sent as keep-markers on it,
// since they aren't part of what it manages and doing so would be meaningless
// at best.
export const NON_INVOICE_DOC_SOURCES = [
  'supplierCertificate',
  'articlesOfAssociation',
  'articleOfAssociation',
  'BaghdadTransactionRequest',
];

// PUT multiCInvoicePaymentDetails/:id (multer .fields(), hard-restricted to
// exactly these 9 names). Which subset is relevant depends on the invoice's
// applicationBank, mirroring the web app's UploadApplicationsDocumentsModal.
export const BAGHDAD_PAYMENT_DOC_TYPES = [
  'BaghdadTransactionRequest',
  'BaghdadEntryRequest',
  'BaghdadPromise',
  'BaghdadConfirmation',
  'BaghdadPaymentDetails',
];

export const MANSUR_PAYMENT_DOC_TYPES = [
  'BankPledge',
  'MansurTransactionRequest',
  'MansurBankPromise',
  'MansurBankForeignCurrencyTradingWindowRequest',
];

export const paymentDocTypesForBank = bankNameWithNoSpace => {
  if (bankNameWithNoSpace === 'مصرفبغداد') {
    return BAGHDAD_PAYMENT_DOC_TYPES;
  }
  if (bankNameWithNoSpace === 'مصرفالمنصور') {
    return MANSUR_PAYMENT_DOC_TYPES;
  }
  return [];
};
