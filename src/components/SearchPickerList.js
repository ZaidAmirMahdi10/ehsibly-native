import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';

import CustomText from './CustomText';
import SearchInput from './SearchInput';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import ListEmptyState from './ListEmptyState';
import PrimaryButton from './PrimaryButton';
import {COLORS} from '../constants/theme';


// Shared search + list + "add new" body, reused by the supplier/sub-company/
// foreign-bank pickers so each one only has to supply data-fetching and a
// row renderer, not the whole screen shell.
const SearchPickerList = ({
  search,
  onSearchChange,
  onSubmitSearch,
  searchPlaceholder,
  items,
  keyExtractor,
  renderItemLabel,
  onSelectItem,
  isLoading,
  error,
  onRetry,
  addLabel,
  onAddPress,
}) => {
  const {t} = useTranslation();

  return (
    <View style={styles.flex}>
      <SearchInput
        style={styles.searchWrap}
        placeholder={searchPlaceholder || t('searchPlaceholder')}
        value={search}
        onChangeText={onSearchChange}
        onSubmitEditing={onSubmitSearch}
      />

      {addLabel && onAddPress ? (
        <PrimaryButton title={addLabel} onPress={onAddPress} style={styles.addBtn} />
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{height: 8}} />}
          ListEmptyComponent={<ListEmptyState titleKey="noResultsFound" subtitleKey="tryDifferentSearch" />}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => onSelectItem(item)}>
              <CustomText style={styles.rowLabel} paddingTop={0}>
                {renderItemLabel(item)}
              </CustomText>
              <CustomText style={styles.chevron} paddingTop={0}>
                ›
              </CustomText>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  searchWrap: {marginHorizontal: 16, marginTop: 12},
  addBtn: {marginHorizontal: 16, marginTop: 12},
  listContent: {padding: 16, flexGrow: 1},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowLabel: {flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '600'},
  chevron: {fontSize: 20, color: COLORS.primaryLight},
});

export default SearchPickerList;
