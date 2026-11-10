import React, {useState, useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

import SegmentedTabs from '../../../components/SegmentedTabs';
import ManagementList from '../../../components/ManagementList';
import InfoBox from '../../../components/InfoBox';
import {getIraqiBanks, getForeignBanks} from '../../../services/banks';

const BanksSection = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [kind, setKind] = useState('iraqi'); // 'iraqi' | 'foreign'
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  const fetchItems = useCallback(
    async search => {
      const fn = kind === 'iraqi' ? getIraqiBanks : getForeignBanks;
      // getAllBanks reads `searchQuery` (not `search`).
      const data = await fn({page: 1, limit: 50, searchQuery: search});
      return data?.banks || [];
    },
    [kind],
  );

  const tabs = [
    {key: 'iraqi', label: t('iraqiBanksTab')},
    {key: 'foreign', label: t('foreignBanksTab')},
  ];

  const isIraqi = kind === 'iraqi';

  return (
    <View style={styles.flex}>
      <SegmentedTabs tabs={tabs} value={kind} onChange={setKind} />
      {/* Iraqi banks are shared reference data managed centrally — merchants can
          only view them (the backend rejects add/edit), so the list is read-only:
          no add button (addLabel/onAddPress omitted) and no edit on tap
          (onSelectItem omitted). Foreign banks stay fully editable. */}
      {isIraqi ? <InfoBox text={t('iraqiBanksViewOnlyNote')} style={styles.hint} /> : null}
      <ManagementList
        // Remount (reset search + reload) when switching Iraqi/Foreign.
        key={kind}
        fetchItems={fetchItems}
        reloadKey={reloadKey}
        keyExtractor={item => String(item.id)}
        renderItemLabel={item => item.name || '—'}
        searchPlaceholder={t('searchBankPlaceholder')}
        addLabel={isIraqi ? undefined : t('addForeignBankAction')}
        onAddPress={
          isIraqi
            ? undefined
            : () => navigation.navigate('AddBank', {isIraqi: false, onCreated: reload})
        }
        onSelectItem={
          isIraqi
            ? undefined
            : item =>
                navigation.navigate('AddBank', {isIraqi: false, editItem: item, onSaved: reload})
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  hint: {marginHorizontal: 16, marginTop: 12},
});

export default BanksSection;
