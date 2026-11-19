import React, {useState, useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import ManagementList from '../../../components/ManagementList';
import {getSuppliers} from '../../../services/suppliers';

const SuppliersSection = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const fetchItems = useCallback(async search => {
    // The API pages its results (and the web pages the list); load them all so
    // no supplier is only reachable through search.
    const all = [];
    let page = 1;
    let totalPages = 1;
    do {
      const data = await getSuppliers({page, limit: 100, search});
      all.push(...(data?.suppliers || []));
      totalPages = data?.totalPages || 1;
      page += 1;
    } while (page <= totalPages && page <= 50);
    return all;
  }, []);

  return (
    <ManagementList
      fetchItems={fetchItems}
      reloadKey={reloadKey}
      keyExtractor={item => String(item.id)}
      renderItemLabel={item => item.name || '—'}
      searchPlaceholder={t('searchSupplierPlaceholder')}
      addLabel={t('addSupplierAction')}
      onAddPress={() => navigation.navigate('AddSupplier', {onCreated: reload})}
      onSelectItem={item =>
        navigation.navigate('EntityDetail', {kind: 'supplier', item, onSaved: reload})
      }
    />
  );
};

export default SuppliersSection;
