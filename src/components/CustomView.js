import React, {useContext} from 'react';
import {View} from 'react-native';
import {LanguageContext} from '../../App';

const CustomView = ({children, style, row, reverse, ...props}) => {
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  return (
    <View
      style={[
        {
          direction: currentDirection,
          writingDirection: currentDirection,
        },
        row && {
          flexDirection: reverse
            ? isRTL
              ? 'row'
              : 'row-reverse'
            : isRTL
            ? 'row-reverse'
            : 'row',
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
};

export default CustomView;