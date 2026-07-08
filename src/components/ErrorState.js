import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';
import PrimaryButton from './PrimaryButton';

const ErrorState = ({message, onRetry}) => {
  const {t} = useTranslation();

  return (
    <View style={styles.container}>
      <CustomText center style={styles.icon} lineHeight={34} paddingTop={0}>
        ⚠️
      </CustomText>
      <CustomText center style={styles.message}>
        {message || t('genericErrorMessage')}
      </CustomText>
      {onRetry ? (
        <PrimaryButton
          title={t('retry')}
          onPress={onRetry}
          variant="secondary"
          style={styles.retryBtn}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#5B6472',
    marginBottom: 16,
  },
  retryBtn: {
    minWidth: 140,
  },
});

export default ErrorState;
