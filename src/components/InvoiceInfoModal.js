import React, {useContext, useEffect, useState} from 'react';
import {Modal, View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';
import ErrorState from './ErrorState';
import {getInvoiceById} from '../services/invoices/multiContainerWithoutC';
import {COLORS} from '../constants/theme';

const toDate = v => (v ? new Date(v).toISOString().split('T')[0] : '');

const InfoRow = ({label, value, isRTL}) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return (
    <View style={[styles.row, isRTL && styles.rowRTL]}>
      <CustomText style={styles.rowLabel} paddingTop={0}>
        {label}
      </CustomText>
      <CustomText style={styles.rowValue} paddingTop={0} align={isRTL ? 'left' : 'right'}>
        {String(value)}
      </CustomText>
    </View>
  );
};

// Mirrors the web's NoCustomerInformationModal: general invoice info, then one
// block per shipped container. Print/edit actions are web-only and left out.
const InvoiceInfoModal = ({invoiceId, visible, onClose}) => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setInvoice(await getInvoiceById(invoiceId));
    } catch (err) {
      setError(t('genericErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && invoiceId) {
      setInvoice(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, invoiceId]);

  const containers = invoice?.ShippedContainer || [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.handle} />
          <CustomText bold center style={styles.title} paddingTop={0}>
            {t('invoiceDetail')}
          </CustomText>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={COLORS.primary} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : invoice ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <InfoRow isRTL={isRTL} label={t('supplierLabel')} value={invoice.supplier?.name} />
              <InfoRow isRTL={isRTL} label={t('invoiceNumberLabel')} value={invoice.invoiceNumber} />
              <InfoRow isRTL={isRTL} label={t('amountForSupplierLabel')} value={invoice.amountForSupplier} />
              <InfoRow isRTL={isRTL} label={t('infoDate')} value={toDate(invoice.date)} />
              <InfoRow isRTL={isRTL} label={t('infoCompany')} value={invoice.subCompany?.name} />
              <InfoRow isRTL={isRTL} label={t('infoCreatedBy')} value={invoice.user?.username} />

              <CustomText bold style={styles.section} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                {t('containersTitle')}
              </CustomText>
              {containers.length === 0 ? (
                <CustomText style={styles.empty} paddingTop={0}>
                  {t('infoNoContainers')}
                </CustomText>
              ) : (
                containers.map((c, i) => (
                  <View key={c.id ?? i} style={styles.container}>
                    {containers.length > 1 ? (
                      <CustomText bold style={styles.containerTitle} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                        {t('infoContainerN', {n: i + 1})}
                      </CustomText>
                    ) : null}
                    <InfoRow isRTL={isRTL} label={t('containerNumberLabel')} value={c.containerNumber} />
                    <InfoRow isRTL={isRTL} label={t('infoExpectedArrival')} value={toDate(c.expectedArrivalDate)} />
                    <InfoRow isRTL={isRTL} label={t('infoFinalDestination')} value={c.finalDestination} />
                    <InfoRow isRTL={isRTL} label={t('infoMaterial')} value={c.material} />
                    <InfoRow isRTL={isRTL} label={t('infoBoxes')} value={c.numberOfBoxes} />
                    <InfoRow isRTL={isRTL} label={t('infoUnit')} value={c.measuringUnit} />
                    <InfoRow isRTL={isRTL} label={t('infoShipper')} value={c.shipper} />
                    <InfoRow isRTL={isRTL} label={t('infoShippingDate')} value={toDate(c.shippingDate)} />
                    <InfoRow isRTL={isRTL} label={t('infoExitDate')} value={toDate(c.exitDate)} />
                    <InfoRow isRTL={isRTL} label={t('infoEntryDate')} value={toDate(c.dateOfEntry)} />
                    <InfoRow isRTL={isRTL} label={t('infoPermitsDate')} value={toDate(c.permitsReceivingDate)} />
                    <InfoRow isRTL={isRTL} label={t('notesLabel')} value={c.notes} />
                  </View>
                ))
              )}
            </ScrollView>
          ) : null}

          <TouchableOpacity style={styles.closeBtn} activeOpacity={0.85} onPress={onClose}>
            <CustomText bold style={styles.closeText} paddingTop={0}>
              {t('infoClose')}
            </CustomText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  title: {fontSize: 16, color: COLORS.text, marginBottom: 10},
  loader: {marginVertical: 40},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowRTL: {flexDirection: 'row-reverse'},
  rowLabel: {fontSize: 13, color: COLORS.textMuted, fontWeight: '600'},
  rowValue: {fontSize: 13, color: COLORS.text, fontWeight: '700', flexShrink: 1},
  section: {fontSize: 13, color: COLORS.primaryDark, marginTop: 18, marginBottom: 4},
  empty: {fontSize: 13, color: COLORS.textMuted, paddingVertical: 10},
  container: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  containerTitle: {fontSize: 12, color: COLORS.primary, marginTop: 6},
  closeBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  closeText: {color: '#fff', fontSize: 14},
});

export default InvoiceInfoModal;
