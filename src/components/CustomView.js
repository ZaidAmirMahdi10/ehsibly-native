import {useContext} from 'react';
import {View} from 'react-native';
import { LanguageContext } from '../../App';


const CustomView = ({children, style, ...props}) => {
  const langContext = useContext(LanguageContext);

  return (
    <View
      style={[{direction: langContext?.currentDirection || 'ltr'}, style]}
      {...props}>
      {children}
    </View>
  );
};

export default CustomView;
