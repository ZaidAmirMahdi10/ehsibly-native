import React from 'react';
import {ScrollView, View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import CustomText from '../../components/CustomText';
import SupplierDocuments from '../../components/SupplierDocuments';
import PrimaryButton from '../../components/PrimaryButton';
import {COLORS} from '../../constants/theme';

// Read-only details of a sub-company / supplier — what the web shows when a
// row is opened. "Edit" then opens the edit form (same as the web's Edit
// button in that modal).
const ADDRESS_EXTRA = [
  ['supplierDistrict', 'district'],
  ['supplierFloor', 'floor'],
  ['supplierDepartmentAndFlat', 'departmentAndFlat'],
  ['supplierRoomOrShop', 'roomOrShop'],
  ['supplierPoBox', 'poBox'],
];

const INFO_KEYS = [
  'addressInAr', 'countryCode', 'commercialCompanyType', 'certificateIssueDate', 'registrationNumber',
  'originatorType', 'BusinessSector', 'typeOfGoods', 'generalPurpose', 'purposeDetails', 'supplier1',
  'supplier2', 'supplier3', 'estimatedPaymentsCountPerQuarter', 'estimatedPaymentsValuePerQuarter',
  'numberOfEmployees', 'annualRevenue', 'sFirstNameInAr', 'sLastNameInAr', 'sFirstName', 'sLastName',
  'sDateOfBirth', 'sPhoneNumber', 'sAddress', 'sCity', 'sCountry', 'sPosition', 'sIsOwner',
  'sOwnerPercentage', 'sIsAuthorizedSignatory', 'sidType',
];
const INFO_LABEL = {BusinessSector: 'businessSector'};

const SIGNATORY_KEYS = [
  'aFirstNameInAr', 'aLastNameInAr', 'aFirstName', 'aLastName', 'aDateOfBirth', 'aPhoneNumber', 'aAddress',
  'aCity', 'aCountry', 'aIsOwner', 'aOwnerPercentage', 'aIsAuthorizedSeniorManaging', 'aIdType', 'aIdNumber',
];

const fmt = (key, v) => {
  if (v === null || v === undefined || v === '') {
    return '-';
  }
  if (key.includes('Date')) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().split('T')[0];
  }
  return String(v);
};

const Row = ({label, value}) => (
  <View style={styles.row}>
    <CustomText style={styles.label} paddingTop={0}>
      {label}:
    </CustomText>
    <CustomText bold style={styles.value} paddingTop={0}>
      {value || '-'}
    </CustomText>
  </View>
);

const Section = ({title, children}) => (
  <View style={styles.section}>
    {title ? (
      <CustomText bold style={styles.sectionTitle}>
        {title}
      </CustomText>
    ) : null}
    {children}
  </View>
);

const BankAccounts = ({accounts, t}) =>
  accounts?.length ? (
    <Section title={t('bankAccountInfo')}>
      {accounts.map((a, i) => (
        <View key={a.id ?? i} style={i > 0 ? styles.accountGap : null}>
          <Row label={t('bankName')} value={a?.bank?.name} />
          <Row label={t('branch')} value={a?.branch?.address || a?.branch?.name} />
          <Row label={t('accountNumber')} value={a?.accountNumber} />
          <Row label={t('accountCurrency')} value={a?.accountCurrency} />
          <Row label={t('SWIFT')} value={a?.swiftCode} />
          <Row label={t('IBAN')} value={a?.iban} />
        </View>
      ))}
    </Section>
  ) : null;

const EntityDetailScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {kind, item, onSaved} = useRoute().params;

  const edit = () =>
    navigation.replace(kind === 'supplier' ? 'AddSupplier' : 'AddSubCompany', {
      editItem: item,
      onSaved: () => {
        onSaved?.();
      },
    });

  let body;
  if (kind === 'supplier') {
    // NB: like the web, "supplierCompany" labels the name and "supplierName" the company.
    body = (
      <>
        <Section>
          <Row label={t('supplierCompany')} value={item.name} />
          <Row label={t('supplierName')} value={item.company} />
          <Row label={t('businessSector')} value={item.businessSector || '---'} />
          <Row label={t('website')} value={item.website} />
          <Row label={t('email')} value={item.email} />
          <Row label={t('address')} value={item.address} />
          <Row label={t('country')} value={item.country} />
          <Row label={t('city')} value={item.city} />
          {ADDRESS_EXTRA.map(([label, key]) => (
            <Row key={key} label={t(label)} value={item[key]} />
          ))}
          <Row label={t('phoneNumber')} value={item.phoneNumber} />
          <Row label={t('countryCode')} value={item.countryCode} />
          <Row label={t('typeOfGoods')} value={item.typeOfGoods} />
          <Row label={t('relationWithTheSupplier')} value={item.relationWithSupplier} />
        </Section>
        <BankAccounts accounts={item.bankAccount} t={t} />
        <SupplierDocuments supplierId={item.id} readOnly />
      </>
    );
  } else {
    const info = item.comSupAdditionalInfo;
    const extras = item.addtionalAuthorizedSignatory || [];
    const signatories = [info, ...extras].filter(
      s => s && SIGNATORY_KEYS.some(k => s[k] !== null && s[k] !== undefined && s[k] !== ''),
    );
    body = (
      <>
        <Section>
          <Row label={t('companyName')} value={item.nameInAr} />
          <Row label={t('companyNameInEn')} value={item.name} />
          <Row label={t('addressInEn')} value={item.address} />
          <Row label={t('street')} value={item.street} />
          {ADDRESS_EXTRA.map(([label, key]) => (
            <Row key={key} label={t(label)} value={item[key]} />
          ))}
          <Row label={t('resblock')} value={item.resblock} />
          <Row label={t('building')} value={item.building} />
          <Row label={t('nearestLandMark')} value={item.nearestLandmark} />
          <Row label={t('country')} value={item.country} />
          <Row label={t('city')} value={item.city} />
          <Row label={t('website')} value={item.website} />
          <Row label={t('email')} value={item.email} />
          <Row label={t('phoneNumber')} value={item.phoneNumber} />
          <Row label={t('idNumber')} value={item.idNumber} />
          <Row label={t('customsCode')} value={item.customsCode} />
        </Section>
        <BankAccounts accounts={item.bankAccount} t={t} />
        {info ? (
          <Section title={t('extraInformation')}>
            {INFO_KEYS.map(k => (
              <Row key={k} label={t(INFO_LABEL[k] || k)} value={fmt(k, info[k])} />
            ))}
            {signatories.map((s, i) => (
              <View key={i} style={styles.accountGap}>
                {SIGNATORY_KEYS.map(k => (
                  <Row key={k} label={t(k)} value={fmt(k, s[k])} />
                ))}
              </View>
            ))}
          </Section>
        ) : null}
      </>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {body}
      <PrimaryButton title={t('edit')} onPress={edit} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.surface},
  container: {padding: 16, paddingBottom: 40},
  section: {marginBottom: 16},
  sectionTitle: {fontSize: 15, color: COLORS.text, marginBottom: 8, marginTop: 4},
  accountGap: {marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border},
  row: {paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#efebf5', gap: 2},
  label: {fontSize: 12, color: COLORS.textMuted},
  value: {fontSize: 14, color: COLORS.text},
});

export default EntityDetailScreen;
