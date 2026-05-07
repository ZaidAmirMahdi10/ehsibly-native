// src/components/ProductModal.js

import React, {useContext} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../App';

import CustomText from './CustomText';
import CustomView from './CustomView';
import UpdatedBadge from './UpdatedBadge';
import FeaturedBadge from './FeaturedBadge';


const ProductModal = ({product, visible, onClose}) => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  if (!product) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <CustomView style={styles.modalContainer}>
        <Image source={{uri: product.image}} style={styles.modalImage} />

        <TouchableOpacity
          style={[styles.modalClose, isRTL ? styles.leftClose : styles.rightClose]}
          onPress={onClose}
          activeOpacity={0.8}>
          <Text style={styles.modalCloseText}>✕</Text>
        </TouchableOpacity>

        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
          <CustomView row style={styles.modalMeta}>
            <CustomText style={styles.modalCategory}>
              {t(product.category).toUpperCase()}
            </CustomText>

            {product.featured && <FeaturedBadge />}
          </CustomView>

          <CustomText style={styles.modalTitle}>{t(product.name)}</CustomText>

          <CustomView row style={styles.modalPriceRow}>
            <CustomText style={styles.modalPrice}>
              ${product.price.toFixed(2)}
            </CustomText>

            <UpdatedBadge time={`${t('updated')} ${t(product.updatedAt)}`} />
          </CustomView>

          <View style={styles.divider} />

          <CustomText style={styles.modalSectionLabel}>
            {t('aboutThisProduct')}
          </CustomText>

          <CustomText style={styles.modalDescription}>
            {t(product.description)}
          </CustomText>

          <CustomView row style={styles.tagsRow}>
            {product.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <CustomText center style={styles.tagText}>
                  {t(tag)}
                </CustomText>
              </View>
            ))}
          </CustomView>

          <View style={[styles.infoNote, isRTL ? styles.infoNoteRTL : styles.infoNoteLTR]}>
            <CustomText style={styles.infoNoteText}>
              ℹ️ {t('productInfoNote')}
            </CustomText>
          </View>

          <View style={{height: 40}} />
        </ScrollView>
      </CustomView>
    </Modal>
  );
};

export default ProductModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F6F3',
  },
  modalImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#EFEFEF',
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
    color: '#C1121F',
  },
  modalTitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
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
    color: '#C1121F',
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginBottom: 20,
  },
  modalSectionLabel: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#A8A8A8',
    marginBottom: 10,
  },
  modalDescription: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 15,
    color: '#6B6B6B',
    lineHeight: 24,
    marginBottom: 20,
  },
  tagsRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#FFF0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    fontWeight: '600',
    color: '#C1121F',
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