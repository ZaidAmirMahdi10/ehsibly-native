import React, {useState} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';

import CustomText from './CustomText';
import FormField from './FormField';
import DatePickerField from './DatePickerField';
import PrimaryButton from './PrimaryButton';
import {COLORS} from '../constants/theme';

// Mirrors the web's SubCompanyAdditionalInfoSection + the helpers around it in
// pages/merchant-pages/SubCompanies.js (same field names, same payload shape).

const PRIMARY_KEY = 'isPrimarySignatory';

const EMPTY_SIGNATORY = {
  aFirstName: '',
  aLastName: '',
  aFirstNameInAr: '',
  aLastNameInAr: '',
  aDateOfBirth: null,
  aPhoneNumber: '',
  aAddress: '',
  aCity: '',
  aCountry: '',
  aIsOwner: '',
  aOwnerPercentage: '',
  aIsAuthorizedSeniorManaging: '',
  aIdType: '',
  aIdNumber: '',
};

export const emptyAdditionalInfo = () => ({
  addressInAr: '',
  countryCode: '',
  BusinessSector: '',
  typeOfGoods: '',
  commercialCompanyType: '',
  certificateIssueDate: null,
  registrationNumber: '',
  originatorType: '',
  generalPurpose: '',
  purposeDetails: '',
  supplier1: '',
  supplier2: '',
  supplier3: '',
  estimatedPaymentsCountPerQuarter: '',
  estimatedPaymentsValuePerQuarter: '',
  numberOfEmployees: '',
  annualRevenue: '',
  sFirstName: '',
  sLastName: '',
  sFirstNameInAr: '',
  sLastNameInAr: '',
  sDateOfBirth: null,
  sPhoneNumber: '',
  sAddress: '',
  sCity: '',
  sCountry: '',
  sPosition: '',
  sIsOwner: '',
  sOwnerPercentage: '',
  sIsAuthorizedSignatory: '',
  sidType: '',
  authorizedSignatories: [{...EMPTY_SIGNATORY, [PRIMARY_KEY]: true}],
});

const toYMD = v => {
  if (!v) {
    return null;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

// Builds the form state from a stored sub-company (web: openSubCompanyModal /
// buildAuthorizedSignatoriesForUi): the primary signatory lives inside the
// additional-info row, the others in addtionalAuthorizedSignatory.
export const additionalInfoFromServer = (info, extraSignatories = []) => {
  const base = emptyAdditionalInfo();
  const state = {...base};
  Object.keys(base).forEach(key => {
    if (key !== 'authorizedSignatories' && info && info[key] != null) {
      state[key] = info[key];
    }
  });
  state.certificateIssueDate = toYMD(info?.certificateIssueDate);
  state.sDateOfBirth = toYMD(info?.sDateOfBirth);

  const pick = src =>
    Object.fromEntries(
      Object.keys(EMPTY_SIGNATORY).map(k => [k, src?.[k] ?? EMPTY_SIGNATORY[k]]),
    );
  const list = [];
  const primary = {...pick(info), aDateOfBirth: toYMD(info?.aDateOfBirth), [PRIMARY_KEY]: true};
  if (hasNonEmptySignatory(primary)) {
    list.push(primary);
  }
  (extraSignatories || []).forEach(sig => {
    const item = {...pick(sig), aDateOfBirth: toYMD(sig?.aDateOfBirth), [PRIMARY_KEY]: false};
    if (hasNonEmptySignatory(item)) {
      list.push(item);
    }
  });
  state.authorizedSignatories = list.length ? list : [{...EMPTY_SIGNATORY, [PRIMARY_KEY]: true}];
  return state;
};

const hasValue = (key, value) => {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (key.includes('Date')) {
    return !Number.isNaN(new Date(value).getTime());
  }
  return true;
};

const hasNonEmptySignatory = (signatory = {}) =>
  Object.entries(signatory).some(([key, value]) => key !== PRIMARY_KEY && hasValue(key, value));

const normalizeSignatory = (signatory = {}) => ({
  ...Object.fromEntries(Object.entries(signatory).filter(([key]) => key !== PRIMARY_KEY)),
  aDateOfBirth: signatory.aDateOfBirth ? new Date(signatory.aDateOfBirth) : null,
});

// Same split as the web: the primary signatory is merged into additionalInfo,
// the rest go as addtionalAuthSignatory (sic — the backend's spelling).
export const splitAuthorizedSignatoriesPayload = (infoState = {}) => {
  const {authorizedSignatories = [], ...otherFields} = infoState || {};
  const nonEmpty = authorizedSignatories.filter(hasNonEmptySignatory);
  const primary = nonEmpty.find(s => s?.[PRIMARY_KEY]) || nonEmpty[0];
  const extras = nonEmpty.filter(s => s !== primary);

  const hasInfo = Object.entries(otherFields).some(([key, value]) => hasValue(key, value));
  const hasPrimary = hasNonEmptySignatory(primary);

  const additionalInfo =
    hasInfo || hasPrimary
      ? {
          ...otherFields,
          certificateIssueDate: otherFields.certificateIssueDate
            ? new Date(otherFields.certificateIssueDate)
            : null,
          sDateOfBirth: otherFields.sDateOfBirth ? new Date(otherFields.sDateOfBirth) : null,
          ...(hasPrimary ? normalizeSignatory(primary) : {}),
        }
      : null;

  return {
    additionalInfo,
    addtionalAuthSignatory: extras.map(normalizeSignatory),
  };
};

const TEXT_FIELDS_TOP = [
  ['addressInAr', 'addressInAr'],
  ['countryCode', 'countryCode'],
  ['commercialCompanyType', 'commercialCompanyType'],
  ['certificateIssueDate', 'certificateIssueDate', 'date'],
  ['registrationNumber', 'registrationNumber'],
  ['originatorType', 'originatorType'],
  ['BusinessSector', 'businessSector'],
  ['typeOfGoods', 'typeOfGoods'],
  ['generalPurpose', 'generalPurpose'],
  ['purposeDetails', 'purposeDetails', 'multiline'],
];

const SUPPLIER_FIELDS = ['supplier1', 'supplier2', 'supplier3'];

const TEXT_FIELDS_MID = [
  'estimatedPaymentsCountPerQuarter',
  'estimatedPaymentsValuePerQuarter',
  'numberOfEmployees',
  'annualRevenue',
];

const SENIOR_FIELDS = [
  ['sFirstNameInAr', 'sFirstNameInAr'],
  ['sLastNameInAr', 'sLastNameInAr'],
  ['sFirstName', 'firstNameInEn'],
  ['sLastName', 'lastNameInEn'],
  ['sDateOfBirth', 'sDateOfBirth', 'date'],
  ['sPhoneNumber', 'sPhoneNumber', 'phone'],
  ['sAddress', 'sAddress'],
  ['sCity', 'sCity'],
  ['sCountry', 'sCountry'],
  ['sPosition', 'sPosition'],
  ['sIsOwner', 'sIsOwner'],
  ['sOwnerPercentage', 'sOwnerPercentage'],
  ['sIsAuthorizedSignatory', 'sIsAuthorizedSignatory'],
  ['sidType', 'sidType'],
];

const SIGNATORY_FIELDS = [
  ['aFirstNameInAr', 'aFirstNameInAr'],
  ['aLastNameInAr', 'aLastNameInAr'],
  ['aFirstName', 'firstNameInEn'],
  ['aLastName', 'lastNameInEn'],
  ['aDateOfBirth', 'aDateOfBirth', 'date'],
  ['aPhoneNumber', 'aPhoneNumber', 'phone'],
  ['aAddress', 'aAddress'],
  ['aCity', 'aCity'],
  ['aCountry', 'aCountry'],
  ['aIsOwner', 'aIsOwner'],
  ['aOwnerPercentage', 'aOwnerPercentage'],
  ['aIsAuthorizedSeniorManaging', 'aIsAuthorizedSeniorManaging'],
  ['aIdType', 'aIdType'],
  ['aIdNumber', 'aIdNumber'],
];

const SubCompanyAdditionalInfo = ({value, onChange}) => {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);

  const setField = (key, v) => onChange({...value, [key]: v});
  const setSignatoryField = (index, key, v) =>
    onChange({
      ...value,
      authorizedSignatories: value.authorizedSignatories.map((s, i) => (i === index ? {...s, [key]: v} : s)),
    });
  const addSignatory = () =>
    onChange({
      ...value,
      authorizedSignatories: [...value.authorizedSignatories, {...EMPTY_SIGNATORY, [PRIMARY_KEY]: false}],
    });
  const removeSignatory = index => {
    const rest = value.authorizedSignatories.filter((_, i) => i !== index);
    onChange({
      ...value,
      authorizedSignatories: rest.length ? rest : [{...EMPTY_SIGNATORY, [PRIMARY_KEY]: true}],
    });
  };

  const renderField = (data, setter, [key, labelKey, kind]) =>
    kind === 'date' ? (
      <DatePickerField
        key={key}
        label={t(labelKey)}
        value={data[key] || null}
        onChange={v => setter(key, v)}
        placeholder={t(labelKey)}
      />
    ) : (
      <FormField
        key={key}
        label={t(labelKey)}
        value={data[key] ?? ''}
        onChangeText={v => setter(key, v)}
        multiline={kind === 'multiline'}
        keyboardType={kind === 'phone' ? 'phone-pad' : undefined}
      />
    );

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.header} activeOpacity={0.7} onPress={() => setOpen(o => !o)}>
        <CustomText bold style={styles.title} paddingTop={0}>
          {t('additionalInfo')}
        </CustomText>
        <CustomText style={styles.chevron} paddingTop={0}>
          {open ? '▲' : '▼'}
        </CustomText>
      </TouchableOpacity>

      {open ? (
        <View style={styles.body}>
          {TEXT_FIELDS_TOP.map(f => renderField(value, setField, f))}

          <CustomText bold style={styles.subTitle}>
            {t('spcifySuppliers')}
          </CustomText>
          {SUPPLIER_FIELDS.map(k => renderField(value, setField, [k, k, 'multiline']))}
          {TEXT_FIELDS_MID.map(k => renderField(value, setField, [k, k]))}

          <CustomText bold style={styles.subTitle}>
            {t('significantParties')}
          </CustomText>
          <CustomText bold style={styles.sectionLabel}>
            {t('seniorManagingOfficial')}
          </CustomText>
          {SENIOR_FIELDS.map(f => renderField(value, setField, f))}

          <CustomText bold style={styles.subTitle}>
            {t('authorizedSignatory')}
          </CustomText>
          {value.authorizedSignatories.map((signatory, index) => (
            <View key={index} style={styles.signatory}>
              <CustomText bold style={styles.sectionLabel}>
                {`${t('authorizedSignatory')} ${index + 1}`}
              </CustomText>
              {SIGNATORY_FIELDS.map(f => renderField(signatory, (k, v) => setSignatoryField(index, k, v), f))}
              {value.authorizedSignatories.length > 1 ? (
                <PrimaryButton title={t('delete')} variant="danger" onPress={() => removeSignatory(index)} />
              ) : null}
            </View>
          ))}
          <PrimaryButton title={`+ ${t('addAuthorizedSignatory')}`} variant="secondary" onPress={addSignatory} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.surface,
  },
  title: {fontSize: 15, color: COLORS.text},
  chevron: {fontSize: 12, color: COLORS.textMuted},
  body: {padding: 14, paddingTop: 4},
  subTitle: {fontSize: 14, color: COLORS.primary, marginTop: 10, marginBottom: 8},
  sectionLabel: {fontSize: 13, color: COLORS.text, marginBottom: 8},
  signatory: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
});

export default SubCompanyAdditionalInfo;
