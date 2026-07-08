import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';
import {COLORS} from '../constants/theme';

// Maps raw backend document "type" strings to i18n label keys. Falls back to
// rendering the raw type if a mapping isn't known yet — new document types
// showing up unstyled is a much safer failure mode than hiding them.
export const DOC_LABEL_KEYS = {
  invoice: 'docInvoice',
  supplierCertificate: 'docSupplierCertificate',
  articlesOfAssociation: 'docArticlesOfAssociation',
  customsDeclaration: 'docCustomsDeclaration',
  thirdPartyContract: 'docThirdPartyContract',
  shippingPolicy: 'docShippingPolicy',
  exitPermit: 'docExitPermit',
  BaghdadTransactionRequest: 'docBaghdadTransactionRequest',
  BaghdadEntryRequest: 'docBaghdadEntryRequest',
  BaghdadPromise: 'docBaghdadPromise',
  BaghdadConfirmation: 'docBaghdadConfirmation',
  BaghdadPaymentDetails: 'docBaghdadPaymentDetails',
  BankPledge: 'docBankPledge',
  MansurTransactionRequest: 'docMansurTransactionRequest',
  MansurBankPromise: 'docMansurBankPromise',
  MansurBankForeignCurrencyTradingWindowRequest: 'docMansurForeignCurrencyRequest',
};

const DOC_ICONS = {
  invoice: '📄',
  supplierCertificate: '📋',
  articlesOfAssociation: '📑',
  customsDeclaration: '🛃',
  thirdPartyContract: '📜',
  shippingPolicy: '🚢',
  exitPermit: '🛂',
  BaghdadTransactionRequest: '🏦',
  BaghdadEntryRequest: '📝',
  BaghdadPromise: '📝',
  BaghdadConfirmation: '✅',
  BaghdadPaymentDetails: '💳',
  BankPledge: '🏦',
  MansurTransactionRequest: '🏦',
  MansurBankPromise: '📝',
  MansurBankForeignCurrencyTradingWindowRequest: '💱',
};

const DocumentListItem = ({type, isRTL, onView, onDelete}) => {
  const {t} = useTranslation();
  const labelKey = DOC_LABEL_KEYS[type];

  return (
    <View style={[styles.row, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
      <View style={styles.iconWrap}>
        <CustomText style={styles.icon} paddingTop={0}>
          {DOC_ICONS[type] || '📄'}
        </CustomText>
      </View>
      <CustomText bold style={styles.label} numberOfLines={1}>
        {labelKey ? t(labelKey) : type}
      </CustomText>
      <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.7}>
        <CustomText style={styles.viewBtnText} paddingTop={0}>
          {t('docViewBtn')}
        </CustomText>
      </TouchableOpacity>
      {onDelete ? (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
          <CustomText style={styles.deleteBtnText} paddingTop={0}>
            ✕
          </CustomText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  icon: {fontSize: 18},
  label: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  viewBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  deleteBtnText: {fontSize: 13, color: COLORS.danger, fontWeight: '700'},
});

export default DocumentListItem;
