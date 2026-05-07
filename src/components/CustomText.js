// components/CustomText.js

import React, {useContext} from 'react';
import {Text} from 'react-native';
import {LanguageContext} from '../../App';

const CustomText = ({children, style, center, ...props}) => {
  const {currentDirection} = useContext(LanguageContext);

  return (
    <Text
      style={[
        {
          fontFamily: 'Tajawal-Regular',
          writingDirection: currentDirection,
          textAlign: center
            ? 'center'
            : currentDirection === 'rtl'
            ? 'right'
            : 'left',
        },
        style,
      ]}
      {...props}>
      {children}
    </Text>
  );
};

export default CustomText;