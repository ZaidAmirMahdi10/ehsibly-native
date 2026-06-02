import React, {useState, useContext, useRef} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';

import {LanguageContext} from '../../App';
import CustomText from '../components/CustomText';
import CustomView from '../components/CustomView';
import CustomInput from '../components/CustomInput';

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#C1121F',
  primaryLight: '#FF4757',
  bg: '#F8F6F3',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textMuted: '#A8A8A8',
  border: '#EFEFEF',
  borderFocus: '#C1121F',
  tag: '#FFF0F0',
  tagText: '#C1121F',
  inputBg: '#FAFAFA',
  dangerBg: '#FFF5F5',
  dangerBorder: '#FECACA',
};

// ─── Category icons map ───────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  Accessories: '👜',
  Kitchen:     '🍳',
  Home:        '🏠',
  Lighting:    '💡',
  Clothing:    '👕',
  Other:       '📦',
};
const DEFAULT_ICON = '🏷';

// ─── Mock initial categories with product counts ──────────────────────────────
const INITIAL_CATEGORIES = [
  {id: '1', name: 'Accessories', count: 2},
  {id: '2', name: 'Kitchen',     count: 2},
  {id: '3', name: 'Home',        count: 1},
  {id: '4', name: 'Lighting',    count: 1},
  {id: '5', name: 'Clothing',    count: 0},
  {id: '6', name: 'Other',       count: 0},
];

// ─── Category Row ─────────────────────────────────────────────────────────────
const CategoryRow = ({item, index, total, onMoveUp, onMoveDown, onDelete, isRTL}) => {
  const {t} = useTranslation();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleDelete = () => {
    Alert.alert(t('deleteAlertTitle'), t('deleteAlertMessage'), [
      {text: t('deleteAlertCancel'), style: 'cancel'},
      {
        text: t('deleteAlertConfirm'),
        style: 'destructive',
        onPress: () => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(() => onDelete(item.id));
        },
      },
    ]);
  };

  return (
    <Animated.View style={[styles.categoryRow, {opacity: fadeAnim}, index === total - 1 && styles.categoryRowLast]}>
      {/* ── Reorder controls ── */}
      <View style={styles.reorderCol}>
        <TouchableOpacity
          onPress={() => onMoveUp(index)}
          disabled={index === 0}
          style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
          activeOpacity={0.6}>
          <CustomText center style={styles.reorderIcon} paddingTop={0}>▲</CustomText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onMoveDown(index)}
          disabled={index === total - 1}
          style={[styles.reorderBtn, index === total - 1 && styles.reorderBtnDisabled]}
          activeOpacity={0.6}>
          <CustomText center style={styles.reorderIcon} paddingTop={0}>▼</CustomText>
        </TouchableOpacity>
      </View>

      {/* ── Icon ── */}
      <View style={styles.categoryIconWrap}>
        <CustomText center style={styles.categoryIcon} paddingTop={0}>
          {CATEGORY_ICONS[item.name] ?? DEFAULT_ICON}
        </CustomText>
      </View>

      {/* ── Name & count ── */}
      <View style={styles.categoryInfo}>
        <CustomText style={styles.categoryName} paddingTop={0}>
          {item.name}
        </CustomText>
        <CustomText style={styles.categoryCount} paddingTop={0}>
          {item.count} {t('productsCount')}
        </CustomText>
      </View>

      {/* ── Delete ── */}
      <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.7}>
        <CustomText center style={styles.deleteBtnText} paddingTop={0}>✕</CustomText>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoriesScreen({navigation}) {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [inputError, setInputError] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  // ── Add ──
  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) { setInputError(t('categoryEmpty')); return; }
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setInputError(t('categoryExists')); return;
    }
    const newId = Date.now().toString();
    setCategories(prev => [...prev, {id: newId, name: trimmed, count: 0}]);
    setNewCategory('');
    setInputError('');
  };

  // ── Delete ──
  const handleDelete = id => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  // ── Move up ──
  const handleMoveUp = index => {
    if (index === 0) return;
    setCategories(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  // ── Move down ──
  const handleMoveDown = index => {
    if (index === categories.length - 1) return;
    setCategories(prev => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Top Bar ── */}
      <CustomView style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <CustomText center style={styles.backBtnText} paddingTop={0}>
            {isRTL ? '→' : '←'}
          </CustomText>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <CustomText center style={styles.topBarEyebrow} paddingTop={0}>
            {t('categoriesEyebrow')}
          </CustomText>
          <CustomText center style={styles.topBarTitle} paddingTop={0}>
            {t('categoriesTitle')}
          </CustomText>
        </View>

        {/* Category count badge */}
        <View style={styles.countBadge}>
          <CustomText center style={styles.countBadgeNum} paddingTop={0}>
            {categories.length}
          </CustomText>
          <CustomText center style={styles.countBadgeLabel} paddingTop={0}>
            {t('totalCategories')}
          </CustomText>
        </View>
      </CustomView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Add Category Input ── */}
        <View style={styles.addSection}>
          <CustomText style={styles.addLabel} paddingTop={0}>
            {t('addCategory')}
          </CustomText>
          <View style={styles.addRow}>
            <View style={[
              styles.addInputWrap,
              inputFocused && styles.addInputWrapFocused,
              !!inputError && styles.addInputWrapError,
            ]}>
              <CustomInput
                style={styles.addInput}
                value={newCategory}
                onChangeText={v => {setNewCategory(v); setInputError('');}}
                placeholder={t('addCategoryPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              onPress={handleAdd}
              style={[styles.addBtn, !newCategory.trim() && styles.addBtnDisabled]}
              activeOpacity={0.8}
              disabled={!newCategory.trim()}>
              <CustomText center style={styles.addBtnText} paddingTop={0}>
                + {t('add')}
              </CustomText>
            </TouchableOpacity>
          </View>
          {!!inputError && (
            <CustomText style={styles.inputError} paddingTop={0}>
              ⚠ {inputError}
            </CustomText>
          )}
        </View>

        {/* ── Categories List ── */}
        <View style={styles.section}>
          <CustomView style={styles.sectionHeader}>
            <View style={styles.sectionNumber}>
              <CustomText center style={styles.sectionNumberText} paddingTop={0}>
                ☰
              </CustomText>
            </View>
            <View style={{flex: 1}}>
              <CustomText style={styles.sectionTitle} paddingTop={0}>
                {t('sectionManage')}
              </CustomText>
              <CustomText style={styles.sectionSubtitle} paddingTop={0}>
                {t('sectionManageSubtitle')}
              </CustomText>
            </View>
          </CustomView>

          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <CustomText center style={styles.emptyIcon} paddingTop={0}>🗂</CustomText>
              <CustomText center style={styles.emptyText} paddingTop={0}>
                {t('emptyCategories')}
              </CustomText>
              <CustomText center style={styles.emptySub} paddingTop={0}>
                {t('emptyCategoriesSub')}
              </CustomText>
            </View>
          ) : (
            categories.map((item, index) => (
              <CategoryRow
                key={item.id}
                item={item}
                index={index}
                total={categories.length}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDelete={handleDelete}
                isRTL={isRTL}
              />
            ))
          )}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />
          <CustomText center style={styles.footerText} paddingTop={0}>
            {t('footerNote')}
          </CustomText>
          <View style={styles.footerDot} />
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 4,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.primary,
    marginBottom: 2,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  countBadge: {
    alignItems: 'center',
  },
  countBadgeNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    textAlign: 'center',
    lineHeight: 40,
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    overflow: 'hidden',
  },
  countBadgeLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Add section
  addSection: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  addLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addInputWrap: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    minHeight: 50,
    justifyContent: 'center',
  },
  addInputWrapFocused: {
    borderColor: COLORS.borderFocus,
  },
  addInputWrapError: {
    borderColor: COLORS.primary,
  },
  addInput: {
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  inputError: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 8,
  },

  // Section card
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // Category row
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  categoryRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  reorderCol: {
    gap: 2,
    alignItems: 'center',
  },
  reorderBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBtnDisabled: {
    opacity: 0.25,
  },
  reorderIcon: {
    fontSize: 9,
    color: COLORS.textSub,
    fontWeight: '700',
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.tag,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
    gap: 2,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});