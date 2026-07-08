import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';

// Colors matched directly against the web app's
// ehsibly-frontend/src/scss/components/_c-status-badge.scss — kept as exact
// hex values here rather than reusing this app's own theme palette, since
// the point of this screen is fidelity to that specific design, not this
// app's usual muted tones.
const VARIANTS = {
  green: {bg: '#4caf50', text: '#fff'},
  blue: {bg: '#2196f3', text: '#fff'},
  red: {bg: '#f44336', text: '#fff'},
  gray: {bg: '#a8a8a8', text: '#fff'},
  orange: {bg: '#f2cb05', text: '#fff'},
  royalGreen: {bg: 'transparent', text: '#136207'},
};

const BankStatusPill = ({variant = 'gray', label}) => {
  const {t} = useTranslation();
  const {bg, text} = VARIANTS[variant] || VARIANTS.gray;

  return (
    <View style={[styles.pill, {backgroundColor: bg}, variant === 'royalGreen' && styles.royalGreen]}>
      <CustomText style={[styles.text, {color: text}]} paddingTop={0} bold>
        {t(label)}
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  royalGreen: {paddingHorizontal: 0, paddingVertical: 0},
  text: {fontSize: 11},
});

export default BankStatusPill;
