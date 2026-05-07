import {createContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppContext = createContext();

export const AppProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);

  // Get Stored user
  useEffect(() => {
    const getStoredUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      console.log('storedUser', JSON.parse(storedUser)?.accessToken);
      setUser(JSON.parse(storedUser));
    };
    getStoredUser();
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        tokens,
        setTokens,
        candidateDetails,
        setCandidateDetails,
      }}>
      {children}
    </AppContext.Provider>
  );
};
