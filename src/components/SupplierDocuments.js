import React, {useCallback, useContext, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';

import {LanguageContext} from '../../App';
import {useAlert} from '../context/AlertContext';
import CustomText from './CustomText';
import DocumentListItem, {DOC_LABEL_KEYS} from './DocumentListItem';
import DocumentUploadZone from './DocumentUploadZone';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import {
  deleteSupplierDocument,
  getSupplierDocuments,
  uploadSupplierDocument,
} from '../services/suppliers';
import {getInvoiceFileUrl, isInvoiceFileAvailable} from '../services/invoices/multiContainerWithoutC';
import {BENEFICIARY_DOC_TYPES, BENEFICIARY_UPLOAD_SLOTS} from '../constants/documentTypes';
import {COLORS} from '../constants/theme';

// A supplier's own documents (supplier certificate + articles of association):
// view, delete, upload — immediate actions, independent of the surrounding
// form's Save button. Same backend contract as the invoice's "Beneficiary
// Docs" tab: one full-sync endpoint, so every other document's name is sent as
// a keep-marker.
const SupplierDocuments = ({supplierId}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {showAlert} = useAlert();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [docs, setDocs] = useState([]);
  const [brokenIds, setBrokenIds] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingType, setUploadingType] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = (await getSupplierDocuments(supplierId)).filter(d => BENEFICIARY_DOC_TYPES.includes(d.name));
      setDocs(list);
      setIsLoading(false);
      // Flag files the server can't actually serve (like the invoice tab).
      const results = await Promise.all(
        list.map(async doc => {
          try {
            return (await isInvoiceFileAvailable(doc.id)) ? null : doc.id;
          } catch (err) {
            return null;
          }
        }),
      );
      const next = {};
      results.filter(Boolean).forEach(id => {
        next[id] = true;
      });
      setBrokenIds(next);
    } catch (err) {
      setError(t('genericErrorMessage'));
      setIsLoading(false);
    }
  }, [supplierId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const allNames = docs.map(d => d.name);

  const handleView = doc => {
    navigation.navigate('DocumentViewer', {
      url: getInvoiceFileUrl(doc.id),
      title: t(DOC_LABEL_KEYS[doc.name] || 'docViewBtn'),
    });
  };

  const handleDelete = doc => {
    showAlert(t('deleteBeneficiaryDocTitle'), t('deleteBeneficiaryDocMessage'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('deleteAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSupplierDocument(supplierId, doc.name, allNames);
            await load();
          } catch (err) {
            showAlert(t('genericErrorMessage'));
          }
        },
      },
    ]);
  };

  const handleUpload = async docType => {
    let file;
    try {
      [file] = await pick({type: [types.pdf, types.images]});
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        showAlert(t('uploadErrorMessage'));
      }
      return;
    }
    setUploadingType(docType);
    try {
      await uploadSupplierDocument(
        supplierId,
        docType,
        {uri: file.uri, name: file.name || docType, type: file.type || 'application/pdf'},
        allNames,
      );
      await load();
    } catch (err) {
      showAlert(t('uploadErrorMessage'));
    } finally {
      setUploadingType(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <CustomText bold style={styles.title}>
        {t('beneficiaryDocsTitle')}
      </CustomText>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          {docs.map(doc => (
            <DocumentListItem
              key={doc.id}
              type={doc.name}
              isRTL={isRTL}
              broken={!!brokenIds[doc.id]}
              onView={() => handleView(doc)}
              onDelete={() => handleDelete(doc)}
            />
          ))}
          {BENEFICIARY_UPLOAD_SLOTS.filter(slot => !docs.some(doc => slot.aliases.includes(doc.name))).map(slot => (
            <DocumentUploadZone
              key={slot.type}
              label={t(DOC_LABEL_KEYS[slot.type])}
              uploading={uploadingType === slot.type}
              onPress={() => handleUpload(slot.type)}
            />
          ))}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {marginTop: 8, marginBottom: 20},
  title: {fontSize: 14, color: COLORS.text, marginBottom: 10},
});

export default SupplierDocuments;
