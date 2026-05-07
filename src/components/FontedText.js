import React, {useContext} from 'react';
import {Text} from 'react-native';

import {LanguageContext} from '../../App';

const FontedText = ({children, style, paddingTop}) => {
  const context = useContext(LanguageContext);
  const currentDirection = context?.currentDirection;

  return (
    <Text
      style={[
        style,
        {fontFamily: 'Tajawal'},
        {textAlign: currentDirection === 'rtl' ? 'right' : 'left'},
        {lineHeight: 20},
        {paddingTop: paddingTop ?? 2}, 
      ]}>
      {children}
    </Text>
  );
};

export default FontedText;
