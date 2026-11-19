import React, {useState, useCallback, useContext} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import {LanguageContext} from '../../../../App';
import EntityListRow from '../../../components/EntityListRow';
import ManagementList from '../../../components/ManagementList';
import {getSubCompaniesDetailed} from '../../../services/subCompanies';

const SubCompaniesSection = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const isRTL = useContext(LanguageContext)?.currentDirection === 'rtl';
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const fetchItems = useCallback(async search => {
    const data = await getSubCompaniesDetailed({page: 1, limit: 200, search});
    return data?.subCompanies || [];
  }, []);

  return (
    <ManagementList
      fetchItems={fetchItems}
      reloadKey={reloadKey}
      keyExtractor={item => String(item.id)}
      renderItemLabel={item => item.name || item.nameInAr || '—'}
      renderRow={item => {
        // same rule as the web: RTL → Arabic name first, otherwise English
        const main = isRTL ? item.nameInAr || item.name : item.name;
        const other = isRTL ? item.nameInAr && item.name : item.nameInAr;
        return (
          <EntityListRow
            title={main || '—'}
            subtitle={other}
            onPress={() => navigation.navigate('EntityDetail', {kind: 'subCompany', item, onSaved: reload})}
          />
        );
      }}
      searchPlaceholder={t('searchSubCompanyPlaceholder')}
      addLabel={t('addSubCompanyAction')}
      onAddPress={() => navigation.navigate('AddSubCompany', {onCreated: reload})}
      onSelectItem={item =>
        navigation.navigate('EntityDetail', {kind: 'subCompany', item, onSaved: reload})
      }
    />
  );
};

export default SubCompaniesSection;
