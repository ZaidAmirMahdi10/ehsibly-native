import {TouchableOpacity, ActivityIndicator, StyleSheet} from 'react-native';
import CustomText from './CustomText';

const PrimaryButton = ({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}) => {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isSecondary ? '#79329a' : '#fff'} />
      ) : (
        <CustomText
          center
          bold
          style={[
            styles.text,
            isSecondary && styles.secondaryText,
            isDanger && styles.dangerText,
          ]}
          paddingTop={0}>
          {title}
        </CustomText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#79329a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#F1E9F6',
  },
  danger: {
    backgroundColor: '#FBEAEA',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 15,
  },
  secondaryText: {
    color: '#79329a',
  },
  dangerText: {
    color: '#C1121F',
  },
});

export default PrimaryButton;
