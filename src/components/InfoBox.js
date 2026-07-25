import React, {useContext} from 'react';
import {StyleSheet, View} from 'react-native';
import {AlertTriangle, CheckCircle2} from 'lucide-react-native';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';

const VARIANT_COLORS = {
  info: {backgroundColor: '#EAF1FB', textColor: '#2563EB'},
  error: {backgroundColor: '#FFEBEE', textColor: '#C62828'},
  success: {backgroundColor: '#E7F7EF', textColor: '#1E8E5A'},
};

// General-purpose banner for telling the user something about the screen
// they're on rather than reacting to an action (that's ErrorState's job).
// Prefer the ErrorBox / ConfirmationBox wrappers over passing variant/isError
// directly, so call sites read by intent.
const InfoBox = ({text, title, variant, isError = false, icon = 'ℹ️', style}) => {
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const resolvedVariant = variant || (isError ? 'error' : 'info');
  const {backgroundColor, textColor} = VARIANT_COLORS[resolvedVariant];

  return (
    <View
      style={[
        styles.container,
        {backgroundColor, flexDirection: isRTL ? 'row-reverse' : 'row'},
        style,
      ]}>
      {resolvedVariant === 'error' ? (
        <AlertTriangle size={20} color={textColor} strokeWidth={2} />
      ) : resolvedVariant === 'success' ? (
        <CheckCircle2 size={20} color={textColor} strokeWidth={2} />
      ) : (
        <CustomText style={[styles.icon, {color: textColor}]} paddingTop={0} lineHeight={20}>
          {icon}
        </CustomText>
      )}

      <View style={styles.textContainer}>
        {title ? (
          <CustomText bold style={[styles.text, styles.title, {color: textColor}]}>
            {title}
          </CustomText>
        ) : null}
        <CustomText style={[styles.text, {color: textColor}]}>{text}</CustomText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    columnGap: 8,
  },
  icon: {fontSize: 14},
  textContainer: {flex: 1},
  text: {fontSize: 12, lineHeight: 18},
  title: {marginBottom: 2},
});

export default InfoBox;
