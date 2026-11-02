import React, {useState, useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import ManagementList from '../../../components/ManagementList';
import {getFilteredSubCompanies} from '../../../services/subCompanies';

const SubCompaniesSection = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const fetchItems = useCallback(async search => {
    const data = await getFilteredSubCompanies({page: 1, limit: 20, search});
    return data?.subCompanies || [];
  }, []);

  return (
    <ManagementList
      fetchItems={fetchItems}
      reloadKey={reloadKey}
      keyExtractor={item => String(item.id)}
      renderItemLabel={item => item.name || item.nameInAr || '—'}
      searchPlaceholder={t('searchSubCompanyPlaceholder')}
      addLabel={t('addSubCompanyAction')}
      onAddPress={() => navigation.navigate('AddSubCompany', {onCreated: reload})}
      onSelectItem={item =>
        navigation.navigate('AddSubCompany', {editItem: item, onSaved: reload})
      }
    />
  );
};

export default SubCompaniesSection;
