import React, {createContext, useCallback, useContext, useState} from 'react';
import CustomAlert from '../components/CustomAlert';

const AlertContext = createContext(null);

// Native Alert.alert() renders an OS-level dialog that never passes through
// React Native's component tree at all — so it always shows in the
// device's system font, never Tajawal, no matter what CustomText/font
// fixes exist elsewhere. This provider + useAlert() replaces it with a
// real in-tree modal so every alert in the app (errors, confirmations,
// success messages) gets the same font handling as everything else.
export const AlertProvider = ({children}) => {
  const [config, setConfig] = useState(null);

  const showAlert = useCallback((title, message, buttons) => {
    setConfig({
      title,
      message,
      buttons: buttons && buttons.length ? buttons : [{text: 'OK'}],
    });
  }, []);

  const hideAlert = useCallback(() => setConfig(null), []);

  return (
    <AlertContext.Provider value={{showAlert}}>
      {children}
      <CustomAlert config={config} onClose={hideAlert} />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return ctx;
};
