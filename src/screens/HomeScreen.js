import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../App';

import CustomText from '../components/CustomText';
import CustomView from '../components/CustomView';
import CategoryPill from '../components/CategoryPill';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';

const COLORS = {
  primary: '#C1121F',
  primaryDark: '#8B0000',
  primaryLight: '#FF4757',
  bg: '#F8F6F3',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textMuted: '#A8A8A8',
  border: '#EFEFEF',
  tag: '#FFF0F0',
  tagText: '#C1121F',
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  {
    id: '1',
    name: 'Handcrafted Leather Wallet',
    category: 'Accessories',
    price: 89.99,
    description:
      'Full-grain vegetable-tanned leather. Hand-stitched with waxed thread. Fits 8 cards + bills. Ages beautifully with use.',
    image:
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80',
    tags: ['Leather', 'Handmade'],
    featured: true,
    updatedAt: '2 hours ago',
  },
  {
    id: '2',
    name: 'Ceramic Pour-Over Set',
    category: 'Kitchen',
    price: 64.0,
    description:
      'Wheel-thrown stoneware with a matte glaze finish. Includes carafe and single-cup dripper. Dishwasher safe.',
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',
    tags: ['Ceramic', 'Coffee'],
    featured: false,
    updatedAt: 'Yesterday',
  },
  {
    id: '3',
    name: 'Merino Wool Throw',
    category: 'Home',
    price: 129.0,
    description:
      'Extra-fine 18.5 micron merino. 140×200 cm. Naturally temperature-regulating and machine washable on gentle.',
    image: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=600&q=80',
    tags: ['Wool', 'Home'],
    featured: true,
    updatedAt: '3 days ago',
  },
  {
    id: '4',
    name: 'Brass Desk Lamp',
    category: 'Lighting',
    price: 148.5,
    description:
      'Solid brass with an adjustable gooseneck arm. Compatible with E27 bulbs. Includes a 2m fabric cord.',
    image:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80',
    tags: ['Brass', 'Lighting'],
    featured: false,
    updatedAt: '1 week ago',
  },
  {
    id: '5',
    name: 'Linen Tote Bag',
    category: 'Accessories',
    price: 38.0,
    description:
      'Heavy-duty 12 oz linen canvas. Reinforced handles and internal zip pocket. Natural undyed finish.',
    image:
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&q=80',
    tags: ['Linen', 'Eco'],
    featured: false,
    updatedAt: '2 weeks ago',
  },
  {
    id: '6',
    name: 'Walnut Serving Board',
    category: 'Kitchen',
    price: 72.0,
    description:
      'End-grain black walnut with juice groove. Finished with food-safe mineral oil. 40×25 cm.',
    image:
      'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=600&q=80',
    tags: ['Wood', 'Kitchen'],
    featured: true,
    updatedAt: '1 month ago',
  },
];

const CATEGORIES = ['All', 'Accessories', 'Kitchen', 'Home', 'Lighting'];

export default function HomeScreen() {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filteredProducts = INITIAL_PRODUCTS.filter(p => {
    const translatedName = t(p.name).toLowerCase();
    const translatedCategory = t(p.category).toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesCategory =
      activeCategory === 'All' || p.category === activeCategory;

    const matchesSearch =
      translatedName.includes(query) || translatedCategory.includes(query);

    return matchesCategory && matchesSearch;
  });

  const featuredCount = INITIAL_PRODUCTS.filter(p => p.featured).length;

  return (
    <CustomView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <CustomView
        row
        style={[
          styles.header,
          {
            flexDirection: currentDirection === 'rtl' ? 'row' : 'row',
            fontFamily: 'Tajawal-Regular',
          },
        ]}>
        <View
          style={{
            alignItems: currentDirection === 'rtl' ? 'flex-end' : 'flex-start',
          }}>
          <CustomText style={styles.headerEyebrow}>{t('catalogue')}</CustomText>

          <CustomText style={styles.headerTitle}>{t('ourProducts')}</CustomText>
        </View>

        <CustomView style={styles.headerBadgeWrapper}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {INITIAL_PRODUCTS.length}
            </Text>
          </View>

          <CustomText center style={styles.headerBadgeLabel}>
            {t('items')}
          </CustomText>
        </CustomView>
      </CustomView>

      <CustomView row style={styles.searchWrapper}>
        <Text style={[styles.searchIcon, isRTL && styles.searchIconRTL]}>
          ⌕
        </Text>

        <TextInput
          style={[
            styles.searchInput,
            {
              textAlign: isRTL ? 'right' : 'left',
              writingDirection: currentDirection,
            },
          ]}
          placeholder={t('searchProducts')}
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={[styles.searchClear, isRTL && styles.searchClearRTL]}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </CustomView>

      <ScrollView
        horizontal
        inverted={isRTL}
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContent}>
        {CATEGORIES.map(cat => (
          <CategoryPill
            key={cat}
            label={t(cat)}
            active={activeCategory === cat}
            onPress={() => setActiveCategory(cat)}
          />
        ))}
      </ScrollView>

      {activeCategory === 'All' && searchQuery.length === 0 && (
        <View
          style={[
            styles.featuredStrip,
            isRTL ? styles.featuredStripRTL : styles.featuredStripLTR,
          ]}>
          <CustomText style={styles.featuredStripText}>
            ✦ {featuredCount} {t('featuredProductsThisSeason')}
          </CustomText>
        </View>
      )}

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <ProductCard
            item={item}
            onPress={() => {
              setSelectedProduct(item);
              setModalVisible(true);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◎</Text>

            <CustomText center style={styles.emptyText}>
              {t('noProductsFound')}
            </CustomText>

            <CustomText center style={styles.emptySubText}>
              {t('tryDifferentSearchOrCategory')}
            </CustomText>
          </View>
        }
      />

      <ProductModal
        product={selectedProduct}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </CustomView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  header: {
    fontFamily: 'Tajawal-Regular',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 10,
    paddingBottom: 16,
    backgroundColor: COLORS.bg,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.primary,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
    paddingTop: 5
  },
  headerBadgeWrapper: {
    alignItems: 'center',
  },
  headerBadge: {
    fontFamily: 'Tajawal-Regular',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    fontFamily: 'Tajawal-Regular',
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  headerBadgeLabel: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 3,
  },

  searchWrapper: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  searchIconRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  searchInput: {
    fontFamily: 'Tajawal-Regular',
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  searchClear: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    paddingLeft: 8,
  },
  searchClearRTL: {
    paddingLeft: 0,
    paddingRight: 8,
  },

  pillsScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  pillsContent: {
    paddingHorizontal: 20,
    columnGap: 8,
  },

  featuredStrip: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.tag,
    borderRadius: 10,
  },
  featuredStripLTR: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  featuredStripRTL: {
    borderRightWidth: 3,
    borderRightColor: COLORS.primary,
  },
  featuredStripText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.tagText,
    letterSpacing: 0.2,
  },

  listContent: {
    fontFamily: 'Tajawal-Regular',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },

  featuredBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.tag,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredBadgeText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tagText,
  },
  updatedBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  updatedBadgeText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIcon: {
    fontSize: 48,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.textMuted,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalImage: {
    width: '100%',
    height: 300,
    backgroundColor: COLORS.border,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: 'Tajawal-Regular',
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBody: {
    fontFamily: 'Tajawal-Regular',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalMeta: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalCategory: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.primary,
  },
  modalTitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  modalPriceRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalPrice: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  modalDescription: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 15,
    color: COLORS.textSub,
    lineHeight: 24,
    marginBottom: 20,
  },
  tagsRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: COLORS.tag,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.tagText,
  },
  infoNote: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 14,
  },
  infoNoteLTR: {
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  infoNoteRTL: {
    borderRightWidth: 3,
    borderRightColor: '#3B82F6',
  },
  infoNoteText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  rightClose: {
    right: 16,
  },
  leftClose: {
    left: 16,
  },
});
