import React, {useCallback, useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import SearchPickerList from '../../components/SearchPickerList';
import {getFilteredSubCompanies} from '../../services/subCompanies';
import {COLORS} from '../../constants/theme';

const SubCompanyPickerScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {onSelect} = route.params || {};

  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async query => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFilteredSubCompanies({page: 1, limit: 20, search: query || ''});
      setCompanies(data?.subCompanies || []);
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

  const handleSelect = company => {
    onSelect?.(company);
    navigation.goBack();
  };

  return (
    <View style={styles.flex}>
      <SearchPickerList
        search={search}
        onSearchChange={setSearch}
        onSubmitSearch={() => load(search)}
        searchPlaceholder={t('searchSubCompanyPlaceholder')}
        items={companies}
        keyExtractor={item => item.id}
        renderItemLabel={item => item.name}
        onSelectItem={handleSelect}
        isLoading={isLoading}
        error={error}
        onRetry={() => load(search)}
        addLabel={t('addSubCompanyAction')}
        onAddPress={() => navigation.navigate('AddSubCompany', {onCreated: handleSelect})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
});

export default SubCompanyPickerScreen;
