import React, {useCallback, useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import SearchPickerList from '../../components/SearchPickerList';
import {getForeignBanks} from '../../services/banks';
import {COLORS} from '../../constants/theme';

// Most foreign banks in this dataset have exactly one branch (confirmed
// against the real data during the web-flow research pass), so picking a
// bank auto-selects its first branch rather than adding a second picker
// step for the common case.
const BankPickerScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {onSelect} = route.params || {};

  const [search, setSearch] = useState('');
  const [banks, setBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async query => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getForeignBanks({page: 1, limit: 20, searchQuery: query || ''});
      setBanks(data?.banks || []);
    } catch (err) {
      setError(t('genericErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = bank => {
    const branch = bank.branch?.[0];
    onSelect?.({bank, branch});
    navigation.goBack();
  };

  return (
    <View style={styles.flex}>
      <SearchPickerList
        search={search}
        onSearchChange={setSearch}
        onSubmitSearch={() => load(search)}
        searchPlaceholder={t('searchBankPlaceholder')}
        items={banks}
        keyExtractor={item => item.id}
        renderItemLabel={item => item.name}
        onSelectItem={handleSelect}
        isLoading={isLoading}
        error={error}
        onRetry={() => load(search)}
        addLabel={t('addBankAction')}
        onAddPress={() => navigation.navigate('AddBank', {onCreated: handleSelect})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
});

export default BankPickerScreen;
