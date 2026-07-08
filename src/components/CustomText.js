// components/CustomText.js

import React, {useContext} from 'react';
import {Text, StyleSheet} from 'react-native';

import {LanguageContext} from '../../App';
import {FONTS, tajawalFamilyForWeight} from '../constants/fonts';

const CustomText = ({children, style, paddingTop, center, bold, align, lineHeight, ...props}) => {
  const context = useContext(LanguageContext);
  const currentDirection = context?.currentDirection;
  const isRTL = currentDirection === 'rtl';
  const effectiveWeight = bold ? '700' : StyleSheet.flatten(style)?.fontWeight;
  const fontFamily = isRTL ? tajawalFamilyForWeight(effectiveWeight) : FONTS.ENGLISH_DEFAULT;
  return (
    <Text
      style={[
        style,
        {fontFamily},
        {textAlign: align || (center ? 'center' : isRTL ? 'right' : 'left')},
        {lineHeight: lineHeight ?? 20},
        {paddingTop: paddingTop ?? 2},
        bold && {fontWeight: '700'},
      ]}
      {...props}>
      {children}
    </Text>
  );
};

export default CustomText;
