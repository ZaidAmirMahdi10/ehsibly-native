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
      style={[
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