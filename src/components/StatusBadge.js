import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';

// Mirrors the real backend's generalBadgeStatus vocabulary (computed in
// multiContainerInvoiceWithoutCContorller.js), not a generic
// completed/pending/failed tri-state — the actual API returns one of these.
const STATUS_STYLES = {
  NOT_SENT: {bg: '#F1F2F4', fg: '#5B6472', labelKey: 'statusNotSent'},
  NOT_STARTED: {bg: '#EAF1FB', fg: '#2563EB', labelKey: 'statusNotStarted'},
  PENDING: {bg: '#FFF6E5', fg: '#B7791F', labelKey: 'statusPending'},
  PAYMENT_CHECK_PENDING: {bg: '#FFF6E5', fg: '#B7791F', labelKey: 'statusPaymentCheckPending'},
  SENT_TO_POLICIES: {bg: '#EEF2FF', fg: '#4F46E5', labelKey: 'statusSentToPolicies'},
  ACCEPTED: {bg: '#E8F7EE', fg: '#1E8E4F', labelKey: 'statusAccepted'},
  REJECTED: {bg: '#FBEAEA', fg: '#C1121F', labelKey: 'statusRejected'},
};

const FALLBACK_STYLE = {bg: '#F1F2F4', fg: '#5B6472', labelKey: 'statusUnknown'};

const StatusBadge = ({status}) => {
  const {t} = useTranslation();
  const style = STATUS_STYLES[status] || FALLBACK_STYLE;

  return (
    <View style={[styles.pill, {backgroundColor: style.bg}]}>
      <CustomText style={[styles.text, {color: style.fg}]} paddingTop={0}>
        {t(style.labelKey)}
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBadge;
