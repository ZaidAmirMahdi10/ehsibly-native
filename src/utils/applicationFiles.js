import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {fromByteArray} from 'base64-js';
import {downloadPermitFiles} from '../services/generatePermit';

// Web ViewInvoice.js handleGenerateFiles, field for field: re-renders the
// bank's form package for an existing payment (download-only, no records
// touched), saves the ZIP as `<invoiceNumber>-<amount><currency>.zip` and
// opens the OS share sheet so it can be saved / opened.
export const downloadApplicationFiles = async ({invoice, rawInvoice, payment, userId}) => {
  const data = await downloadPermitFiles({
    invoiceId: invoice.id,
    userId,
    companyBankId: rawInvoice.bankId,
    companyBranchId: rawInvoice.branchId,
    companyBankAccountId: rawInvoice.bankAccountId,
    supplierBankAccountId: rawInvoice.supplierBankAccountId,
    supplierBankId: rawInvoice.supplierBankId,
    supplierBranchId: rawInvoice.supplierBranchId,
    paymentPercentage: (Number(payment.amount) / invoice.amountForSupplier) * 100,
    paymentId: payment.id,
    toHongKong: rawInvoice.toHongKong,
    isTransactionService: rawInvoice.isTransactionService,
  });
  const currency = payment.currency || invoice.currency || invoice.supplier?.currency || 'unknown';
  const zipName = `${invoice.invoiceNumber || 'unknown'}-${payment.amount || '0'}${currency}`.replace(
    /[\\/:*?"<>|]+/g,
    '-',
  );
  const path = `${RNFS.CachesDirectoryPath}/${zipName}-${Date.now()}.zip`;
  await RNFS.writeFile(path, fromByteArray(new Uint8Array(data)), 'base64');
  await Share.open({url: `file://${path}`, type: 'application/zip', filename: zipName, failOnCancel: false});
};
