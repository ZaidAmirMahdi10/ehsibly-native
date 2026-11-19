import React, {useContext, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import {useAlert} from '../../context/AlertContext';
import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import DatePickerField from '../../components/DatePickerField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import InfoBox from '../../components/InfoBox';
import ModalSheet from '../../components/ModalSheet';
import StripedCard from '../../components/StripedCard';
import {getInvoiceById, updateInvoice} from '../../services/invoices/multiContainerWithoutC';
import {COLORS} from '../../constants/theme';
import {sanitizeAmountInput, parseAmount, isoToYMD, ymdToISO} from '../../utils/format';

// Mirrors the web's ViewNoCustomerInvoice edit mode. The supplier, sending
// company and currency are fixed (the web never lets you change them either);
// number, amount, date, notes, goods details and the container list are
// editable. The backend only accepts an edit while the invoice's bank status
// is NOT_SENT or REJECTED — the caller gates the entry point, and a
// `cannotUpdateMCIBecauseLinked` answer is surfaced as a normal error.
const EditInvoiceScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {showAlert} = useAlert();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const {invoiceId, onSaved} = route.params;

  const [original, setOriginal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amountForSupplier, setAmountForSupplier] = useState('');
  const [date, setDate] = useState(null);
  const [notes, setNotes] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [goodsQuantityOrWeight, setGoodsQuantityOrWeight] = useState('');
  const [goodsUnitOfMeasurement, setGoodsUnitOfMeasurement] = useState('');
  // Each entry is either an existing container (has `id`, keeps all of its
  // other fields so the backend update doesn't wipe them) or a new
  // {containerNumber}.
  const [containers, setContainers] = useState([]);
  const [containerModalVisible, setContainerModalVisible] = useState(false);
  const [newContainerNumber, setNewContainerNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const full = await getInvoiceById(invoiceId);
      setOriginal(full);
      setInvoiceNumber(full.invoiceNumber || '');
      setAmountForSupplier(full.amountForSupplier ? sanitizeAmountInput(String(full.amountForSupplier)) : '');
      setDate(isoToYMD(full.date));
      setNotes(full.notes || '');
      setGoodsDescription(full.goodsDescription || '');
      setGoodsQuantityOrWeight(full.goodsQuantityOrWeight || '');
      setGoodsUnitOfMeasurement(full.goodsUnitOfMeasurement || '');
      setContainers(full.ShippedContainer || []);
    } catch (err) {
      setLoadError(t('genericErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMessageFor = err => {
    const message = err?.response?.data?.message;
    if (message === 'cannotUpdateMCIBecauseLinked') {
      return t('cannotEditInvoiceError');
    }
    if (message === 'invoiceExistWithSameNumber') {
      return t('invoiceExistsError');
    }
    if (message === 'containerExistWithSameNumber') {
      return t('containerExistsError');
    }
    if (message === 'alreadyLinkedToAnInvoice') {
      return `${t('containerLabel')} ${err.response.data.containerNumber || ''}: ${t('containerLinkedError')}`;
    }
    return message || t('genericErrorMessage');
  };

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      setError(t('invoiceNumberRequiredError'));
      return;
    }
    if (parseAmount(amountForSupplier) <= 0) {
      setError(t('amountRequiredError'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        id: original.id,
        supplierId: original.supplierId,
        organizationId: original.organizationId,
        subCompanyId: original.subCompanyId,
        // The invoice's own creator — NOT the editing session's user. The
        // backend overwrites userId with whatever is sent, and a bare
        // organization login has no user id at all.
        userId: original.userId,
        invoiceNumber: invoiceNumber.trim(),
        received: original.received ?? 0,
        left: original.left ?? 0,
        amountForSupplier: parseAmount(amountForSupplier),
        date: ymdToISO(date),
        notes: notes.trim(),
        goodsDescription: goodsDescription.trim(),
        goodsQuantityOrWeight: goodsQuantityOrWeight.trim(),
        goodsUnitOfMeasurement: goodsUnitOfMeasurement.trim(),
        // Numbers must be real numbers: the route runs parseFloat() on them
        // and a null would become NaN.
        ShippedContainer: containers.map(c => ({
          id: c.id,
          containerNumber: c.containerNumber,
          expectedArrivalDate: c.expectedArrivalDate ?? null,
          finalDestination: c.finalDestination ?? null,
          shipper: c.shipper ?? null,
          material: c.material ?? null,
          numberOfBoxes: c.numberOfBoxes ?? 0,
          measuringUnit: c.measuringUnit ?? '',
          unitPrice: c.unitPrice ?? 0,
          howWasPapersReceived: c.howWasPapersReceived ?? '',
          delivered: c.delivered ?? false,
          exitDate: c.exitDate ?? null,
          dateOfEntry: c.dateOfEntry ?? null,
          shippingDate: c.shippingDate ?? null,
          permitsReceivingDate: c.permitsReceivingDate ?? null,
          amountForSupplier: c.amountForSupplier ?? 0,
          notes: c.notes ?? null,
        })),
      };
      await updateInvoice(payload);
      onSaved?.({
        invoiceNumber: payload.invoiceNumber,
        amountForSupplier: payload.amountForSupplier,
        date: payload.date,
        notes: payload.notes,
        containers: containers.map(c => c.containerNumber),
      });
      navigation.goBack();
    } catch (err) {
      setError(errorMessageFor(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContainer = () => {
    const trimmed = newContainerNumber.replace(/\s+/g, '');
    if (!trimmed) {
      return;
    }
    if (containers.some(c => c.containerNumber === trimmed)) {
      setNewContainerNumber('');
      setContainerModalVisible(false);
      return;
    }
    setContainers(prev => [...prev, {containerNumber: trimmed}]);
    setNewContainerNumber('');
    setContainerModalVisible(false);
  };

  const removeContainer = index => {
    setContainers(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveContainer = index => {
    // Removing a container that already exists deletes it on save — the
    // backend does the same for the web edit — so confirm first.
    if (!containers[index].id) {
      removeContainer(index);
      return;
    }
    showAlert(t('removeContainerConfirmTitle'), t('removeContainerConfirmMessage'), [
      {text: t('cancel'), style: 'cancel'},
      {text: t('deleteAction'), style: 'destructive', onPress: () => removeContainer(index)},
    ]);
  };

  if (isLoading) {
    return <LoadingState />;
  }
  if (loadError || !original) {
    return <ErrorState message={loadError || t('genericErrorMessage')} onRetry={load} />;
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {error ? <ErrorState message={error} /> : null}

      <StripedCard
        isRTL={isRTL}
        style={styles.cardSpacing}
        items={[
          {label: t('supplierLabel'), value: original.supplier?.name || '—'},
          {
            label: t('sendingCompanyLabel'),
            value: (isRTL ? original.subCompany?.nameInAr : null) || original.subCompany?.name || '—',
          },
          {label: t('currencyLabel'), value: original.currency || original.supplier?.currency || '—'},
        ]}
      />

      <FormField label={t('invoiceNumberLabel')} required value={invoiceNumber} onChangeText={setInvoiceNumber} />
      <FormField
        label={t('amountForSupplierLabel')}
        required
        value={amountForSupplier}
        onChangeText={text => setAmountForSupplier(sanitizeAmountInput(text))}
        keyboardType="decimal-pad"
      />
      <DatePickerField label={t('date')} value={date} onChange={setDate} />

      <FormField label={t('goodsDescriptionLabel')} value={goodsDescription} onChangeText={setGoodsDescription} />
      <FormField
        label={t('goodsQuantityOrWeightLabel')}
        value={goodsQuantityOrWeight}
        onChangeText={setGoodsQuantityOrWeight}
      />
      <FormField
        label={t('goodsUnitOfMeasurementLabel')}
        value={goodsUnitOfMeasurement}
        onChangeText={setGoodsUnitOfMeasurement}
      />

      <FormField
        label={t('notesLabel')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('notesPlaceholder')}
        multiline
        numberOfLines={4}
        style={styles.notesInput}
      />
      <InfoBox text={t('notesNotVisibleToBankNote')} style={styles.infoNote} />

      <CustomText bold style={styles.sectionTitle}>
        {t('containersTitle')}
      </CustomText>
      <CustomText style={styles.containersHint}>{t('containersOptionalHint')}</CustomText>
      {containers.map((c, index) => (
        <View key={`${c.id || 'new'}-${c.containerNumber}`} style={[styles.containerChip, styles.rowBetween]}>
          <CustomText paddingTop={0}>{c.containerNumber}</CustomText>
          <TouchableOpacity onPress={() => handleRemoveContainer(index)}>
            <CustomText style={styles.removeContainerText} paddingTop={0}>
              ✕
            </CustomText>
          </TouchableOpacity>
        </View>
      ))}
      <PrimaryButton
        title={`+ ${t('addContainerAction')}`}
        variant="secondary"
        onPress={() => setContainerModalVisible(true)}
        style={styles.addContainerBtn}
      />

      <PrimaryButton
        title={t('saveChangesAction')}
        onPress={handleSubmit}
        loading={isSubmitting}
        style={styles.submitBtn}
      />

      <ModalSheet
        visible={containerModalVisible}
        onClose={() => setContainerModalVisible(false)}
        title={t('addContainerAction')}>
        <FormField
          label={t('containerNumberLabel')}
          required
          value={newContainerNumber}
          onChangeText={setNewContainerNumber}
          autoFocus
        />
        <PrimaryButton title={t('addContainerAction')} onPress={handleAddContainer} />
      </ModalSheet>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
  cardSpacing: {marginBottom: 14},
  notesInput: {minHeight: 100, textAlignVertical: 'top'},
  infoNote: {marginTop: 8, marginBottom: 14},
  sectionTitle: {fontSize: 14, color: COLORS.text, marginTop: 8, marginBottom: 4},
  containersHint: {fontSize: 12, color: COLORS.textMuted, marginBottom: 10},
  rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  containerChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  removeContainerText: {fontSize: 14, color: COLORS.danger, fontWeight: '700'},
  addContainerBtn: {marginBottom: 16},
  submitBtn: {marginTop: 6},
});

export default EditInvoiceScreen;
