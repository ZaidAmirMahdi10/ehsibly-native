import React, {useState, useEffect, useRef, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import SearchPickerList from './SearchPickerList';

// List body shared by the management sections (sub-companies, suppliers,
// banks): search field with live (debounced) suggestions, an "add" button,
// and tappable rows that open the edit flow. The parent supplies a stable-ish
// `fetchItems(search)` and a `reloadKey` it bumps after an add/edit to force a
// refresh while keeping the current search term.
const ManagementList = ({
  fetchItems,
  keyExtractor,
  renderItemLabel,
  searchPlaceholder,
  addLabel,
  onAddPress,
  onSelectItem,
  reloadKey,
}) => {
  const {t} = useTranslation();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep the latest fetcher in a ref so `load` stays stable even if the parent
  // passes a fresh closure each render (avoids reload loops).
  const fetchRef = useRef(fetchItems);
  useEffect(() => {
    fetchRef.current = fetchItems;
  });

  const load = useCallback(
    async query => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchRef.current(query || '');
        setItems(data || []);
      } catch (err) {
        setError(t('genericErrorMessage'));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  // Initial load + whenever the parent bumps reloadKey (after add/edit).
  useEffect(() => {
    load(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, load]);

  // Debounced live search — refetch shortly after the user stops typing.
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const id = setTimeout(() => load(search), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <SearchPickerList
      search={search}
      onSearchChange={setSearch}
      onSubmitSearch={() => load(search)}
      searchPlaceholder={searchPlaceholder}
      items={items}
      keyExtractor={keyExtractor}
      renderItemLabel={renderItemLabel}
      onSelectItem={onSelectItem}
      isLoading={isLoading}
      error={error}
      onRetry={() => load(search)}
      addLabel={addLabel}
      onAddPress={onAddPress}
    />
  );
};

export default ManagementList;
