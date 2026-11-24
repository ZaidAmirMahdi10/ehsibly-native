import React, {useState, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import ManagementList from '../../../components/ManagementList';
import {getForeignBanks} from '../../../services/banks';

const BanksSection = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const fetchItems = useCallback(async search => {
    // getAllBanks reads `searchQuery` (not `search`).
    const data = await getForeignBanks({page: 1, limit: 50, searchQuery: search});
    return data?.banks || [];
  }, []);

  return (
    <View style={styles.flex}>
      <ManagementList
        fetchItems={fetchItems}
        reloadKey={reloadKey}
        keyExtractor={item => String(item.id)}
        renderItemLabel={item => item.name || '—'}
        searchPlaceholder={t('searchBankPlaceholder')}
        addLabel={t('addForeignBankAction')}
        onAddPress={() => navigation.navigate('AddBank', {isIraqi: false, onCreated: reload})}
        onSelectItem={item =>
          navigation.navigate('AddBank', {isIraqi: false, editItem: item, onSaved: reload})
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
});

export default BanksSection;
