import React, {useState, useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import ManagementList from '../../../components/ManagementList';
import {useAuth} from '../../../context/AuthContext';
import {getContainers} from '../../../services/containers';

const ContainersSection = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {session} = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  const subCompanyId = session?.organization?.subCompanyId;

  const fetchItems = useCallback(
    async search => {
      const data = await getContainers({page: 1, limit: 30, search, subCompanyId});
      return data?.shippedContainers || [];
    },
    [subCompanyId],
  );

  return (
    <ManagementList
      fetchItems={fetchItems}
      reloadKey={reloadKey}
      keyExtractor={item => String(item.id)}
      renderItemLabel={item =>
        item.multiContainersInvoice?.invoiceNumber
          ? `${item.containerNumber} · ${item.multiContainersInvoice.invoiceNumber}`
          : item.containerNumber || '—'
      }
      searchPlaceholder={t('searchContainerPlaceholder')}
      addLabel={t('addContainerAction')}
      onAddPress={() => navigation.navigate('ContainerForm', {onSaved: reload})}
      onSelectItem={item => navigation.navigate('ContainerDetail', {id: item.id, onChanged: reload})}
    />
  );
};

export default ContainersSection;
