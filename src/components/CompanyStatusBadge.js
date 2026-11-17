import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';

// Mirrors the web's company-side status cell in BankApplications.js
// (PaymentStatusBadge + TransferStamp) exactly: same status → label/colour
// mapping, same visibility rules, same colours as .c-status-badge.
const BADGE_COLORS = {
  green: '#4caf50',
  blue: '#2196f3',
  red: '#f44336',
  gray: '#a8a8a8',
  orange: '#f2cb05',
};

const BADGES = {
  ASYCUDA_REVIEW: {color: 'blue', labelKey: 'payAsycudaReview'},
  NOT_STARTED: {color: 'gray', labelKey: 'payNotStarted'},
  NOT_SENT: {color: 'orange', labelKey: 'payNotSent'},
  SENT: {color: 'gray', labelKey: 'paySent'},
  PENDING: {color: 'blue', labelKey: 'payInProgress'},
  REJECTED: {color: 'red', labelKey: 'payIncomplete'},
  INCOMPLETE: {color: 'red', labelKey: 'payIncomplete'},
  ACCEPTED: {color: 'green', labelKey: 'payApproved'},
  PAYMENT_CHECK_PENDING: {color: 'blue', labelKey: 'payPaymentCheckPending'},
  SENT_TO_POLICIES: {color: 'blue', labelKey: 'paySentToPolicy'},
  PRIMARY_CHECK: {color: 'blue', labelKey: 'payPrimaryCheck'},
};

// The web only renders this cell for Bank of Baghdad applications that have
// a companyStatus.
const STAMP_GREEN = '#1f8a4c';
const BAGHDAD_BANK = 'مصرفبغداد';

const Badge = ({status}) => {
  const {t} = useTranslation();
  const badge = BADGES[status];
  if (!badge) {
    return null;
  }
  return (
    <View style={[styles.pill, {backgroundColor: BADGE_COLORS[badge.color]}]}>
      <CustomText style={styles.pillText} paddingTop={0}>
        {t(badge.labelKey)}
      </CustomText>
    </View>
  );
};

const TransferStamp = ({number}) => {
  const {t} = useTranslation();
  return (
    <View style={styles.stamp}>
      {/* Only the frame is tilted (like the web's ::before) so the text stays
          upright and sharp. */}
      <View style={styles.stampFrame} pointerEvents="none">
        <View style={styles.stampRingWhite}>
          <View style={styles.stampRingGreen} />
        </View>
      </View>
      <CustomText style={styles.stampLabel} paddingTop={0}>
        {t('transferNumber')}
      </CustomText>
      <CustomText style={styles.stampNumber} paddingTop={0}>
        {number}
      </CustomText>
    </View>
  );
};

const CompanyStatusBadge = ({invoice}) => {
  if (
    !invoice?.companyStatus ||
    invoice?.applicationBank?.nameWithNoSpace !== BAGHDAD_BANK
  ) {
    return null;
  }

  const general = invoice.generalBadgeStatus;
  const transactionNumber = invoice.latestPaymentDetail?.transactionNumber;

  if (transactionNumber) {
    return (
      <View style={styles.column}>
        {general === 'REJECTED' ? <Badge status={general} /> : null}
        <TransferStamp number={transactionNumber} />
      </View>
    );
  }

  return <CompanyStatusPill status={general} />;
};

// Status → badge for the company side (no visibility rules), shared by the
// invoice header and the payment rows.
export const CompanyStatusPill = ({status: general, transactionNumber}) => {
  let status = general;
  // Same as the web's payments table: a transfer number replaces the status
  // with the stamp (plus the red badge only when rejected).
  if (transactionNumber) {
    return (
      <View style={styles.column}>
        {general === 'REJECTED' ? <Badge status={general} /> : null}
        <TransferStamp number={transactionNumber} />
      </View>
    );
  }
  if (general === 'NOT_STARTED' || general === 'PAYMENT_CHECK_PENDING') {
    status = 'SENT';
  } else if (general === 'SENT_TO_POLICIES') {
    // The company never sees "sent to policy" — only the bank does.
    status = 'PRIMARY_CHECK';
  }
  return <Badge status={status} />;
};

const styles = StyleSheet.create({
  column: {gap: 4, alignItems: 'flex-start'},
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pillText: {color: '#fff', fontSize: 12, fontWeight: '600'},
  // Mirrors the web's .c-transfer-stamp: green outline + inner ring, tilted
  // frame, label over a bold number.
  stamp: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 0,
    paddingTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 16,
    minWidth: 76,
  },
  stampFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: STAMP_GREEN,
    borderRadius: 8,
    backgroundColor: 'rgba(31,138,76,0.04)',
    transform: [{rotate: '-3deg'}],
  },
  stampRingWhite: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 6,
  },
  stampRingGreen: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(31,138,76,0.55)',
    borderRadius: 4,
  },
  stampLabel: {color: STAMP_GREEN, fontSize: 8, fontWeight: '700', lineHeight: 9},
  stampNumber: {
    color: STAMP_GREEN,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    lineHeight: 13,
  },
});

export default CompanyStatusBadge;
