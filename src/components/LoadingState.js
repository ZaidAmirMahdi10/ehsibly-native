import {View, ActivityIndicator, StyleSheet} from 'react-native';
import CustomText from './CustomText';

const LoadingState = ({label}) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#79329a" />
    {label ? (
      <CustomText center style={styles.label}>
        {label}
      </CustomText>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: '#8A8FA3',
  },
});

export default LoadingState;
