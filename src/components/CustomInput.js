// components/CustomInput.js

import React, {useContext} from 'react';
import {TextInput} from 'react-native';

import {LanguageContext} from '../../App';
import {FONTS} from '../constants/fonts';

const CustomInput = ({style, textAlign, ...props}) => {
  const context = useContext(LanguageContext);
  const currentDirection = context?.currentDirection || 'ltr';

  return (
    <TextInput
      // Explicit colors: on Android dark-mode phones the default text color is
      // white, which is invisible on the app's white background.
      placeholderTextColor="#9AA0B2"
      selectionColor="#4A5BD4"
      style={[
        {color: '#1A1A1A'},
        style,
        {
          fontFamily: FONTS.DEFAULT,
          direction: currentDirection,
          writingDirection: currentDirection,
          textAlign:
            textAlign || (currentDirection === 'rtl' ? 'right' : 'left'),
        },
      ]}
      {...props}
    />
  );
};

export default CustomInput;