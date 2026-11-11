import React, {useContext, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import DatePickerField from '../../components/DatePickerField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import StripedCard from '../../components/StripedCard';
import {useAuth} from '../../context/AuthContext';
import {createContainer, updateContainer} from '../../services/containers';
import {COLORS} from '../../constants/theme';
import {sanitizeAmountInput, parseAmount, isoToYMD} from '../../utils/format';

const DATE_FIELDS = [
  {key: 'expectedArrivalDate', label: 'expectedArrivalDateLabel'},
  {key: 'shippingDate', label: 'shippingDateLabel'},
  {key: 'exitDate', label: 'exitDateLabel'},
  {key: 'dateOfEntry', label: 'dateOfEntryLabel'},
  {key: 'permitsReceivingDate', label: 'permitsReceivingDateLabel'},
];

const toAmountText = value => (value ? sanitizeAmountInput(String(value)) : '');

// Used for BOTH creating a container (no params) and editing one
// (`editItem` = the full container from getShippedContainer). Creating also
// needs a supplier + sending company (the backend rejects a container without
// a sub-company); on edit they're fixed and shown read-only, matching the
// web (its edit form never lets you move a container to another company).
const ContainerFormScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {session} = useAuth();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const editItem = route.params?.editItem;
  const onSaved = route.params?.onSaved;
  const isEdit = !!editItem;

  const [supplier, setSupplier] = useState(null);
  const [subCompany, setSubCompany] = useState(
    session?.organization?.subCompanyId
      ? {id: session.organization.subCompanyId, name: session.organization.subCompanyName}
      : null,
  );

  const [containerNumber, setContainerNumber] = useState(editItem?.containerNumber || '');
  const [material, setMaterial] = useState(editItem?.material || '');
  const [shipper, setShipper] = useState(editItem?.shipper || '');
  const [finalDestination, setFinalDestination] = useState(editItem?.finalDestination || '');
  const [numberOfBoxes, setNumberOfBoxes] = useState(toAmountText(editItem?.numberOfBoxes));
  const [measuringUnit, setMeasuringUnit] = useState(editItem?.measuringUnit || '');
  const [unitPrice, setUnitPrice] = useState(toAmountText(editItem?.unitPrice));
  const [amountForSupplier, setAmountForSupplier] = useState(toAmountText(editItem?.amountForSupplier));
  const [notes, setNotes] = useState(editItem?.notes || '');
  const [delivered, setDelivered] = useState(!!editItem?.delivered);
  const [dates, setDates] = useState(() => {
    const initial = {};
    DATE_FIELDS.forEach(({key}) => {
      initial[key] = isoToYMD(editItem?.[key]);
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = containerNumber.trim() && (isEdit || (supplier?.id && subCompany?.id));

  const errorMessageFor = err => {
    const message = err?.response?.data?.message;
    if (message === 'invalidContainerNumber') {
      return t('containerNumberRequiredError');
    }
    if (err?.response?.status === 409 || message === 'alreadyLinkedToAnInvoice') {
      return t('containerExistsError');
    }
    return message || t('genericErrorMessage');
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError(t('fillRequiredFieldsError'));
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const fields = {
      containerNumber: containerNumber.replace(/\s+/g, ''),
      material: material.trim(),
      shipper: shipper.trim(),
      finalDestination: finalDestination.trim(),
      numberOfBoxes: parseAmount(numberOfBoxes),
      measuringUnit: measuringUnit.trim(),
      unitPrice: parseAmount(unitPrice),
      amountForSupplier: parseAmount(amountForSupplier),
      notes: notes.trim(),
      delivered,
      ...dates,
    };

    try {
      if (isEdit) {
        const updated = await updateContainer(editItem.id, {
          ...editItem,
          ...fields,
        });
        onSaved?.(updated);
      } else {
        const created = await createContainer({
          supplierId: supplier.id,
          subCompanyId: subCompany.id,
          organizationId: session?.organization?.id,
          createdBy: session?.userId,
          container: fields,
        });
        onSaved?.(created);
      }
      navigation.goBack();
    } catch (err) {
      setError(errorMessageFor(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {error ? <ErrorState message={error} /> : null}

      {isEdit ? (
        <StripedCard
          isRTL={isRTL}
          style={styles.cardSpacing}
          items={[
            {label: t('supplierLabel'), value: editItem.supplier?.name || '—'},
            {label: t('sendingCompanyLabel'), value: editItem.subCompany?.name || '—'},
          ]}
        />
      ) : (
        <>
          <View style={styles.group}>
            <CustomText style={styles.label}>{t('supplierLabel')}</CustomText>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => navigation.navigate('SupplierPicker', {onSelect: setSupplier})}>
              <CustomText style={styles.pickerBtnText} paddingTop={0}>
                {supplier ? supplier.name : t('chooseSupplierPlaceholder')}
              </CustomText>
            </TouchableOpacity>
          </View>
          <View style={styles.group}>
            <CustomText style={styles.label}>{t('sendingCompanyLabel')}</CustomText>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => navigation.navigate('SubCompanyPicker', {onSelect: setSubCompany})}>
              <CustomText style={styles.pickerBtnText} paddingTop={0}>
                {subCompany ? subCompany.name : t('chooseSubCompanyPlaceholder')}
              </CustomText>
            </TouchableOpacity>
          </View>
        </>
      )}

      <FormField label={t('containerNumberLabel')} required value={containerNumber} onChangeText={setContainerNumber} />
      <FormField label={t('materialLabel')} value={material} onChangeText={setMaterial} />
      <FormField label={t('shipperLabel')} value={shipper} onChangeText={setShipper} />
      <FormField label={t('finalDestinationLabel')} value={finalDestination} onChangeText={setFinalDestination} />
      <FormField
        label={t('numberOfBoxesLabel')}
        value={numberOfBoxes}
        onChangeText={text => setNumberOfBoxes(sanitizeAmountInput(text))}
        keyboardType="decimal-pad"
      />
      <FormField label={t('measuringUnitLabel')} value={measuringUnit} onChangeText={setMeasuringUnit} />
      <FormField
        label={t('unitPriceLabel')}
        value={unitPrice}
        onChangeText={text => setUnitPrice(sanitizeAmountInput(text))}
        keyboardType="decimal-pad"
      />
      <FormField
        label={t('amountForSupplierLabel')}
        value={amountForSupplier}
        onChangeText={text => setAmountForSupplier(sanitizeAmountInput(text))}
        keyboardType="decimal-pad"
      />

      {DATE_FIELDS.map(({key, label}) => (
        <DatePickerField
          key={key}
          label={t(label)}
          value={dates[key]}
          onChange={value => setDates(prev => ({...prev, [key]: value}))}
        />
      ))}

      <TouchableOpacity
        style={[styles.toggleRow, isRTL && styles.toggleRowRTL]}
        onPress={() => setDelivered(prev => !prev)}>
        <View style={[styles.checkbox, delivered && styles.checkboxChecked, isRTL && styles.checkboxRTL]}>
          {delivered ? (
            <CustomText style={styles.checkboxMark} paddingTop={0}>
              ✓
            </CustomText>
          ) : null}
        </View>
        <CustomText style={styles.toggleLabel} paddingTop={0}>
          {t('deliveredLabel')}
        </CustomText>
      </TouchableOpacity>

      <FormField
        label={t('notesLabel')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('notesPlaceholder')}
        multiline
        numberOfLines={4}
        style={styles.notesInput}
      />

      <PrimaryButton
        title={isEdit ? t('saveChangesAction') : t('addContainerAction')}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
  group: {marginBottom: 14},
  label: {fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6},
  pickerBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: {fontSize: 14, color: COLORS.text},
  cardSpacing: {marginBottom: 14},
  toggleRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 14},
  toggleRowRTL: {flexDirection: 'row-reverse'},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxRTL: {marginRight: 0, marginLeft: 10},
  checkboxChecked: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  checkboxMark: {color: '#fff', fontSize: 12, fontWeight: '700'},
  toggleLabel: {fontSize: 13, color: COLORS.text},
  notesInput: {minHeight: 100, textAlignVertical: 'top'},
  submitBtn: {marginTop: 6},
});

export default ContainerFormScreen;
