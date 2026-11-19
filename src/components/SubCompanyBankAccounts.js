import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';

import CustomText from './CustomText';
import FormField from './FormField';
import SelectField from './SelectField';
import PrimaryButton from './PrimaryButton';
import {useAlert} from '../context/AlertContext';
import {getIraqiBanks, getForeignBanks} from '../services/banks';
import {COLORS} from '../constants/theme';

// Mirrors the web's BankAccountSection (used by sub-companies with Iraqi banks
// and by suppliers with foreign banks, `foreign`): section title, one account
// shown at a time with previous / next, bank → branch, account number,
// currency, SWIFT, IBAN, delete (with confirmation) and "add bank account".
const CURRENCIES = ['USD', 'IQD', 'EURO', 'RMB', 'JPY', 'TRY', 'AED', 'CHF', 'SAR', 'JOD'];

const emptyAccount = () => ({
  id: undefined,
  bank: null,
  branch: null,
  accountNumber: '',
  accountCurrency: null,
  swiftCode: '',
  iban: '',
});

// Stored accounts (bankAccount[] with bank/branch relations) → form state.
export const bankAccountsFromServer = accounts =>
  accounts?.length
    ? accounts.map(a => ({
        id: a.id,
        bank: a.bank || null,
        branch: a.branch || null,
        accountNumber: a.accountNumber || '',
        accountCurrency: a.accountCurrency || null,
        swiftCode: a.swiftCode || '',
        iban: a.iban || '',
      }))
    : [emptyAccount()];

// Same payload shape the web sends (accounts without a bank are dropped).
export const buildBankAccountsPayload = accounts =>
  accounts
    .filter(a => a.bank?.id)
    .map(a => ({
      bank: {name: a.bank.name, id: a.bank.id},
      branch: {name: a.branch?.name, id: a.branch?.id, address: a.branch?.address},
      accountNumber: a.accountNumber,
      accountCurrency: a.accountCurrency,
      swiftCode: a.swiftCode,
      iban: a.iban,
      id: a.id,
    }));

const SubCompanyBankAccounts = ({value, onChange, onRemoveStored, foreign = false, showErrors = false}) => {
  const {t} = useTranslation();
  const {showAlert} = useAlert();
  const [banks, setBanks] = useState([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await (foreign ? getForeignBanks : getIraqiBanks)({page: 1, limit: 200});
        setBanks(data?.banks || []);
      } catch (err) {
        // non-fatal: the bank selector just stays empty
      }
    })();
  }, [foreign]);

  const index = Math.min(page, value.length - 1);
  const account = value[index];
  const update = patch => onChange(value.map((a, i) => (i === index ? {...a, ...patch} : a)));

  // Same as the web: an account's required fields only matter once a bank is
  // chosen, and the empty ones are highlighted.
  const bad = missing => (showErrors && account.bank && missing ? styles.invalid : undefined);

  const removeCurrent = async () => {
    // Stored accounts are deleted on the server first (the parent confirms and
    // calls the API); unsaved ones are just dropped from the form.
    if (account?.id && onRemoveStored) {
      const done = await onRemoveStored(account);
      if (!done) {
        return;
      }
    }
    const rest = value.filter((_, i) => i !== index);
    onChange(rest.length ? rest : [emptyAccount()]);
    setPage(Math.max(0, index - 1));
  };

  const confirmDelete = () => {
    if (account?.id && onRemoveStored) {
      // the parent shows its own confirmation for stored accounts
      removeCurrent();
      return;
    }
    showAlert(t('deleteBankAccount'), '', [
      {text: t('noDontDelete'), style: 'cancel'},
      {text: t('yesDelete'), style: 'destructive', onPress: removeCurrent},
    ]);
  };

  const branchOptions = (banks.find(b => b.id === account.bank?.id) || account.bank)?.branch || [];

  return (
    <View style={styles.wrap}>
      <CustomText bold style={styles.title}>
        {t('bankAccountInfo')}
      </CustomText>

      <SelectField
        label={t('bankName')}
        value={account.bank}
        placeholder={t('chooseABank')}
        options={banks}
        getLabel={b => b.name}
        getKey={b => b.id}
        onSelect={bank => update({bank, branch: null})}
      />
      <SelectField
        label={t('branch')}
        value={account.branch}
        placeholder={t('chooseABranch')}
        options={branchOptions}
        getLabel={b => b.name}
        getKey={b => b.id}
        fieldStyle={bad(!account.branch?.id)}
        onSelect={branch => update({branch})}
      />
      <FormField
        label={t('accountNumber')}
        value={account.accountNumber}
        onChangeText={v => update({accountNumber: v})}
        style={bad(!account.accountNumber?.trim())}
      />
      <SelectField
        label={t('accountCurrency')}
        value={account.accountCurrency}
        placeholder={t('chooseAccountCurrency')}
        options={CURRENCIES}
        fieldStyle={bad(!account.accountCurrency)}
        onSelect={c => update({accountCurrency: c})}
      />
      <FormField label={t('SWIFT')} value={account.swiftCode} onChangeText={v => update({swiftCode: v})} />
      <FormField label={t('IBAN')} value={account.iban} onChangeText={v => update({iban: v})} />

      {value[0].bank ? (
        <PrimaryButton title={t('delete')} variant="danger" onPress={confirmDelete} style={styles.delete} />
      ) : null}

      {value.length > 0 ? (
        <View style={styles.pager}>
          <PrimaryButton
            title={t('previous')}
            variant="secondary"
            disabled={index === 0}
            onPress={() => setPage(index - 1)}
            style={styles.pagerBtn}
          />
          <PrimaryButton
            title={t('next')}
            variant="secondary"
            disabled={index === value.length - 1}
            onPress={() => setPage(index + 1)}
            style={styles.pagerBtn}
          />
        </View>
      ) : null}

      <PrimaryButton
        title={`+ ${t('addBankAccount')}`}
        variant="secondary"
        onPress={() => {
          onChange([...value, emptyAccount()]);
          setPage(value.length);
        }}
      />
    </View>
  );
};

export {emptyAccount};

const styles = StyleSheet.create({
  wrap: {marginBottom: 16},
  title: {fontSize: 15, color: COLORS.text, marginBottom: 10},
  invalid: {borderColor: COLORS.danger},
  delete: {marginBottom: 10},
  pager: {flexDirection: 'row', gap: 10, marginBottom: 10},
  pagerBtn: {flex: 1},
});

export default SubCompanyBankAccounts;
