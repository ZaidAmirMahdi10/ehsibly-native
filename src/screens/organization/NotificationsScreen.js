import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
  Bell,
  CheckCheck,
  CircleCheck,
  CircleX,
  Clock,
  Send,
} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import SegmentedTabs from '../../components/SegmentedTabs';
import ListEmptyState from '../../components/ListEmptyState';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import {COLORS, CARD_SHADOW} from '../../constants/theme';
import {formatNotificationTime} from '../../utils/format';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  emitNotificationsUpdated,
  onNotificationsUpdated,
} from '../../services/notifications';
import {handleNotificationOpen} from '../../services/push';

const PAGE_SIZE = 20;
const FILTERS = {ALL: 'all', UNREAD: 'unread'};

// Icon + tone per outcome; unknown types fall back to a plain bell.
const TYPE_VISUALS = {
  TRANSACTION_COMPLETED: {Icon: CircleCheck, color: COLORS.success},
  TRANSACTION_INCOMPLETE: {Icon: CircleX, color: COLORS.danger},
  TRANSACTION_SENT: {Icon: Send, color: COLORS.primary},
  ORGANIZATION_SUBSCRIPTION_EXPIRING: {Icon: Clock, color: COLORS.pending},
  ORGANIZATION_SUBSCRIPTION_EXPIRED: {Icon: Clock, color: COLORS.danger},
};
const DEFAULT_VISUAL = {Icon: Bell, color: COLORS.primary};

// "/bankApplications/<id>/payments" → the transaction it refers to.
const invoiceIdFromLink = link => link?.match(/^\/bankApplications\/([^/]+)\//)?.[1];

const NotificationsScreen = ({navigation}) => {
  const {t} = useTranslation();
  const {currentLanguage, currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const lang = currentLanguage === 'en' ? 'en' : 'ar';

  const [filter, setFilter] = useState(FILTERS.ALL);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const load = useCallback(async (cursor, activeFilter) => {
    const data = await getNotifications({
      limit: PAGE_SIZE,
      cursor,
      unread: activeFilter === FILTERS.UNREAD ? true : undefined,
    });
    setItems(prev => (cursor ? [...prev, ...data.notifications] : data.notifications));
    setNextCursor(data.nextCursor);
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
    load(undefined, filter)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filter, load]);

  // A push arrived (or something was read elsewhere): refresh quietly.
  useEffect(
    () =>
      onNotificationsUpdated(() => {
        load(undefined, filterRef.current).catch(() => {});
      }),
    [load],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setError(false);
      await load(undefined, filter);
    } catch (e) {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEndReached = async () => {
    if (!nextCursor || loadingMore) {return;}
    setLoadingMore(true);
    try {
      await load(nextCursor, filter);
    } catch (e) {
      // keep what we have; pull-to-refresh retries
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(item => ({...item, isRead: true})));
      setUnreadCount(0);
      emitNotificationsUpdated();
    } catch (e) {
      // best-effort; the list refreshes on the next pull
    }
  };

  const handlePress = async item => {
    if (!item.isRead) {
      setItems(prev => prev.map(row => (row.id === item.id ? {...row, isRead: true} : row)));
      setUnreadCount(count => Math.max(0, count - 1));
      markNotificationRead(item.id)
        .then(emitNotificationsUpdated)
        .catch(() => {});
    }
    const invoiceId = invoiceIdFromLink(item.link);
    if (invoiceId) {
      await handleNotificationOpen({invoiceId});
    }
  };

  const renderItem = ({item}) => {
    const {Icon, color} = TYPE_VISUALS[item.type] || DEFAULT_VISUAL;
    const rowDir = isRTL ? 'row-reverse' : 'row';
    const align = isRTL ? 'right' : 'left';
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
        style={[styles.card, !item.isRead && styles.cardUnread, {flexDirection: rowDir}]}>
        <View style={[styles.iconTile, {backgroundColor: `${color}1f`}]}>
          <Icon size={20} color={color} />
          {!item.isRead && <View style={styles.dot} />}
        </View>
        <View style={styles.body}>
          <CustomText bold={!item.isRead} style={[styles.title, {textAlign: align}]} paddingTop={0}>
            {item.title?.[lang] || item.title?.ar}
          </CustomText>
          <CustomText style={[styles.message, {textAlign: align}]} paddingTop={0}>
            {item.message?.[lang] || item.message?.ar}
          </CustomText>
        </View>
        <CustomText style={styles.time} paddingTop={0}>
          {formatNotificationTime(item.createdAt, t)}
        </CustomText>
      </TouchableOpacity>
    );
  };

  const tabs = [
    {key: FILTERS.ALL, label: t('notificationsAll')},
    {
      key: FILTERS.UNREAD,
      label: unreadCount > 0 ? `${t('notificationsUnread')} (${unreadCount})` : t('notificationsUnread'),
    },
  ];

  return (
    <View style={styles.container}>
      <SegmentedTabs tabs={tabs} value={filter} onChange={setFilter} />
      <View style={[styles.actions, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={unreadCount === 0}
          onPress={handleMarkAll}
          style={[styles.markAll, {flexDirection: isRTL ? 'row-reverse' : 'row'}, unreadCount === 0 && styles.disabled]}>
          <CheckCheck size={16} color={COLORS.primary} />
          <CustomText bold style={styles.markAllText} paddingTop={0}>
            {t('markAllAsRead')}
          </CustomText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState />
      ) : error && items.length === 0 ? (
        <ErrorState message={t('failedToLoadNotifications')} onRetry={handleRefresh} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <ListEmptyState
              titleKey={filter === FILTERS.UNREAD ? 'noUnreadNotifications' : 'noNotifications'}
              subtitleKey="noNotificationsHint"
            />
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={styles.footer} /> : null}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  actions: {paddingHorizontal: 16, paddingTop: 10},
  markAll: {alignItems: 'center', gap: 6, paddingVertical: 6},
  markAllText: {fontSize: 13, color: COLORS.primary},
  disabled: {opacity: 0.4},
  list: {padding: 16, paddingTop: 8, gap: 10, flexGrow: 1},
  card: {
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    ...CARD_SHADOW,
  },
  cardUnread: {backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.border},
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: -3,
    end: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  body: {flex: 1, gap: 2},
  title: {fontSize: 14, color: COLORS.text},
  message: {fontSize: 12.5, color: COLORS.textMuted},
  time: {fontSize: 11, color: COLORS.textMuted},
  footer: {paddingVertical: 16},
});

export default NotificationsScreen;
