import {createContext, useContext, useEffect, useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/auth';
import {setApiSession, clearApiSession, registerUnauthorizedHandler} from '../services/apiClient';

const SESSION_KEY = 'ehsibly_session';

const AuthContext = createContext(null);

// The real POST /login response shapes differ by userType:
//  - "organization": profile lives under `organization` (+ a separate `subCompany`)
//  - "orgUser": profile lives under `user`, with organization fields flattened onto it
// Both represent an org-side login and are supported here; anything else
// ("user"/individual, or admin/superadmin which use a different login route
// entirely) is rejected — this app only builds the organization experience.
const normalizeSession = data => {
  const {token, userType} = data;

  if (userType === 'organization' && data.organization) {
    const o = data.organization;
    return {
      token,
      userType,
      // No individual User record backs a bare "organization" login — the
      // backend's createdBy/userId fields are nullable for exactly this case.
      userId: null,
      organization: {
        id: o.id,
        name: o.organizationName,
        email: o.email,
        organizationType: o.organizationType,
        phoneNumber: o.orgPhoneNumber,
        invoiceType: o.invoiceType,
        subscriptionType: o.orgSubscriptionType,
        subCompanyId: data.subCompany?.id ?? null,
        subCompanyName: data.subCompany?.name ?? null,
        subCompanyNameInAr: data.subCompany?.nameInAr ?? null,
      },
    };
  }

  if (userType === 'orgUser' && data.user) {
    const u = data.user;
    return {
      token,
      userType,
      // The actual User.id — required as `createdBy`/`userId` on write
      // endpoints (invoice creation, supplier/sub-company creation, etc.),
      // distinct from `organization.id` (the org itself).
      userId: u.id,
      organization: {
        id: u.organizationId,
        name: u.organizationName,
        email: u.email,
        organizationType: u.organizationType,
        phoneNumber: u.phoneNumber,
        username: u.username,
        invoiceType: u.invoiceType,
        role: u.role,
        specialty: u.specialty,
        address: u.address,
        subCompanyId: u.subCompanyId ?? null,
        subCompanyName: u.subCompanyName ?? null,
        subCompanyNameInAr: u.subCompanyNameInAr ?? null,
      },
    };
  }

  return null;
};

export const AuthProvider = ({children}) => {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    clearApiSession();
    setSession(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setApiSession(parsed);
          setSession(parsed);
        }
      } catch (error) {
        console.error('Failed to restore session', error);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email, password, keepLogged = true) => {
    const data = await authService.login(email, password, keepLogged);
    const normalized = normalizeSession(data);

    if (!normalized) {
      throw new Error('unsupportedAccountType');
    }

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    setApiSession(normalized);
    setSession(normalized);
    return normalized;
  }, []);

  const value = {
    session,
    isLoading,
    isAuthenticated: !!session,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
