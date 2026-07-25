import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';

const ListEmptyState = ({titleKey = 'noTransactionsFound', subtitleKey = 'tryDifferentSearch'}) => {
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      {/* lineHeight must be the explicit prop — CustomText's default (20)
          clips a 32px glyph, and a lineHeight inside the style object loses
          to the prop's default. */}
      <CustomText center style={styles.icon} lineHeight={40}>
        📭
      </CustomText>
      <CustomText center bold style={styles.title}>
        {t(titleKey)}
      </CustomText>
      <CustomText center style={styles.subtitle}>
        {t(subtitleKey)}
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    color: '#2A2E3A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A8FA3',
  },
});

export default ListEmptyState;
