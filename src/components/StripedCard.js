import React from 'react';
import {View, StyleSheet} from 'react-native';
import CustomText from './CustomText';

// RN's textAlign: 'auto' claims to align per the text's own script, but in
// practice it's unreliable for wrapped/whitespace-led strings (confirmed on
// a real Arabic sub-company name from the backend — it rendered left-aligned
// instead of right). Detecting the script ourselves from the first strong
// character is deterministic for the two scripts this app actually shows.
const ARABIC_CHAR_RE = /[؀-ۿ]/;
const valueAlign = value => (ARABIC_CHAR_RE.test(value) ? 'right' : 'left');

// `value` is usually a string, but a few rows (e.g. payment status) need to
// show a non-text control like <StatusBadge> — passing a React element
// through as-is skips the text alignment/trimming, which only makes sense
// for strings.
const StripedRow = ({label, value, isRTL}) => {
  if (!value) {
    return null;
  }
  const valueContent = React.isValidElement(value) ? (
    value
  ) : (
    <CustomText style={styles.value} align={valueAlign(String(value).trim())}>
      {String(value).trim()}
    </CustomText>
  );
  return (
    <View style={[styles.row, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
      <CustomText style={styles.label}>{label}</CustomText>
      {valueContent}
    </View>
  );
};

// A white rounded card whose rows are separated by hairline "stripes", with
// an optional title rendered above it and an optional header (e.g. a title +
// status badge row) rendered inside the card, above the rows. `cardStyle` is
// an opt-in extra style for the inner card box itself (e.g. a border/shadow)
// — kept separate from `style` (which positions the whole block) so callers
// that don't pass it keep the plain flat look unchanged.
const StripedCard = ({title, header, items, isRTL, style, cardStyle}) => (
  <View style={style}>
    {title ? (
      <CustomText bold style={styles.title}>
        {title}
      </CustomText>
    ) : null}
    <View style={[styles.card, cardStyle]}>
      {header ? <View style={styles.header}>{header}</View> : null}
      {items.map(({label, value}) => (
        <StripedRow key={label} label={label} value={value} isRTL={isRTL} />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  title: {fontSize: 13, color: '#8A8FA3', marginBottom: 8, paddingHorizontal: 4},
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    columnGap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EAEAEF',
  },
  label: {fontSize: 13, color: '#8A8FA3', flexShrink: 0},
  value: {fontSize: 13, color: '#2A2E3A', fontWeight: '600', flexShrink: 1},
});

export default StripedCard;
