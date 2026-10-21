import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';

// The web's PaymentStatusBadge: same status → colour/label table, so the
// invoice page reads identically on both platforms.
const COLORS_BY_NAME = {
  gray: {bg: '#F1F2F4', fg: '#5B6472'},
  orange: {bg: '#FFF6E5', fg: '#B7791F'},
  blue: {bg: '#EAF1FB', fg: '#2563EB'},
  red: {bg: '#FBEAEA', fg: '#C1121F'},
  green: {bg: '#E8F7EE', fg: '#1E8E4F'},
};

const STATUS_TABLE = {
  NOT_STARTED: {color: 'gray', labelKey: 'psNotStarted'},
  NOT_SENT: {color: 'orange', labelKey: 'psNotSent'},
  SENT: {color: 'gray', labelKey: 'psSent'},
  PENDING: {color: 'blue', labelKey: 'psInProgress'},
  REJECTED: {color: 'red', labelKey: 'psIncomplete'},
  INCOMPLETE: {color: 'red', labelKey: 'psIncomplete'},
  ACCEPTED: {color: 'green', labelKey: 'psApproved'},
  PAYMENT_CHECK_PENDING: {color: 'blue', labelKey: 'psPaymentCheckPending'},
  SENT_TO_POLICIES: {color: 'blue', labelKey: 'psSentToPolicy'},
  PRIMARY_CHECK: {color: 'blue', labelKey: 'psPrimaryCheck'},
};

const PaymentStatusBadge = ({status}) => {
  const {t} = useTranslation();
  const entry = STATUS_TABLE[status];
  if (!entry) {
    return null;
  }
  const {bg, fg} = COLORS_BY_NAME[entry.color];
  return (
    <View style={[styles.pill, {backgroundColor: bg}]}>
      <CustomText style={[styles.text, {color: fg}]} paddingTop={0}>
        {t(entry.labelKey)}
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start'},
  text: {fontSize: 12, fontWeight: '700'},
});

export default PaymentStatusBadge;
