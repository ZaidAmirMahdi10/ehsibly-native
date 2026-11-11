import React, {useCallback, useContext, useEffect, useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import {useAlert} from '../../context/AlertContext';
import CustomText from '../../components/CustomText';
import StripedCard from '../../components/StripedCard';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import {archiveContainer, getContainer} from '../../services/containers';
import {COLORS} from '../../constants/theme';
import {formatAmount, isoToYMD} from '../../utils/format';

const dash = value => (value === null || value === undefined || value === '' ? '—' : String(value));

const ContainerDetailScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {showAlert} = useAlert();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const {id, onChanged} = route.params;

  const [container, setContainer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setContainer(await getContainer(id));
    } catch (err) {
      setError(t('genericErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleEdit = () => {
    navigation.navigate('ContainerForm', {
      editItem: container,
      // Re-fetch rather than trusting the PUT response: it omits relations
      // like the document list and the sub-company name.
      onSaved: () => {
        load();
        onChanged?.();
      },
    });
  };

  const handleArchive = () => {
    showAlert(t('archiveContainerConfirmTitle'), `${t('archiveContainerConfirmMessage')} ${container.containerNumber}`, [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('archiveAction'),
        style: 'destructive',
        onPress: async () => {
          setIsArchiving(true);
          try {
            await archiveContainer(container.id);
            onChanged?.();
            navigation.goBack();
          } catch (err) {
            showAlert(t('genericErrorMessage'));
            setIsArchiving(false);
          }
        },
      },
    ]);
  };

  if (isLoading && !container) {
    return <LoadingState />;
  }
  if (error || !container) {
    return <ErrorState message={error || t('genericErrorMessage')} onRetry={load} />;
  }

  const items = [
    {label: t('containerNumberLabel'), value: dash(container.containerNumber)},
    {label: t('supplierLabel'), value: dash(container.supplier?.name)},
    {label: t('sendingCompanyLabel'), value: dash(container.subCompany?.name)},
    {label: t('invoiceNumberLabel'), value: dash(container.multiContainersInvoice?.invoiceNumber)},
    {label: t('materialLabel'), value: dash(container.material)},
    {label: t('shipperLabel'), value: dash(container.shipper)},
    {label: t('finalDestinationLabel'), value: dash(container.finalDestination)},
    {label: t('numberOfBoxesLabel'), value: dash(container.numberOfBoxes)},
    {label: t('measuringUnitLabel'), value: dash(container.measuringUnit)},
    {label: t('unitPriceLabel'), value: dash(container.unitPrice ? formatAmount(container.unitPrice) : null)},
    {
      label: t('amountForSupplierLabel'),
      value: dash(container.amountForSupplier ? formatAmount(container.amountForSupplier) : null),
    },
    {label: t('expectedArrivalDateLabel'), value: dash(isoToYMD(container.expectedArrivalDate))},
    {label: t('shippingDateLabel'), value: dash(isoToYMD(container.shippingDate))},
    {label: t('exitDateLabel'), value: dash(isoToYMD(container.exitDate))},
    {label: t('dateOfEntryLabel'), value: dash(isoToYMD(container.dateOfEntry))},
    {label: t('permitsReceivingDateLabel'), value: dash(isoToYMD(container.permitsReceivingDate))},
    {label: t('deliveredLabel'), value: container.delivered ? t('yes') : t('no')},
    {label: t('notesLabel'), value: dash(container.notes)},
  ];

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <StripedCard isRTL={isRTL} items={items} />
      <PrimaryButton title={t('edit')} onPress={handleEdit} style={styles.btn} />
      <PrimaryButton
        title={t('archiveAction')}
        variant="danger"
        onPress={handleArchive}
        loading={isArchiving}
        style={styles.btn}
      />
      <CustomText center style={styles.hint}>
        {t('archiveContainerHint')}
      </CustomText>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  content: {padding: 16, paddingBottom: 40},
  btn: {marginTop: 12},
  hint: {fontSize: 12, color: COLORS.textMuted, marginTop: 10},
});

export default ContainerDetailScreen;
