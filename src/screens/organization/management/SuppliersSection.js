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
    const data = await getSuppliers({page: 1, limit: 20, search});
    return data?.suppliers || [];
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
        navigation.navigate('AddSupplier', {editItem: item, onSaved: reload})
      }
    />
  );
};

export default SuppliersSection;
