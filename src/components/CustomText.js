// components/CustomText.js

import React, {useContext} from 'react';
import {Text} from 'react-native';

import {LanguageContext} from '../../App';
import {FONTS} from '../constants/fonts';

const CustomText = ({children, style, paddingTop}) => {
  const context = useContext(LanguageContext);
  const currentDirection = context?.currentDirection;
  return (
    <Text
      style={[
        style,
        {fontFamily: FONTS.DEFAULT},
        {direction: "ltr"},
        {textAlign: currentDirection === 'rtl' ? 'right' : 'left'},
        {lineHeight: 20},
        {paddingTop: paddingTop ?? 2},
      ]}>
      {children}
    </Text>
  );
};

export default CustomText;
