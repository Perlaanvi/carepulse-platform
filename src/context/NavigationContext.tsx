import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate as useRouterNavigate } from 'react-router-dom';
import { NavHistoryEntry } from '../types';

interface NavigateOptions {
  label?: string;
  replace?: boolean;
  params?: Record<string, any>;
}

interface NavigationContextType {
  activeTab: string;
  activeSubView?: string;
  historyStack: NavHistoryEntry[];
  params: Record<string, any>;
  navigate: (tab: string, subView?: string, options?: NavigateOptions) => void;
  goBack: () => void;
  canGoBack: boolean;
  previousEntry: NavHistoryEntry | null;
  getBackLabel: (fallback?: string) => string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const getTabDisplayTitle = (tab: string, subView?: string): string => {
  if (tab === 'control-room' || tab === 'settings') {
    switch (subView) {
      case 'auth':
        return 'Authentication & Session';
      case 'login-history':
        return 'Login History';
      case 'devices':
        return 'Active Devices';
      case 'security':
        return 'Security Center';
      case 'notifications':
        return 'Notifications';
      case 'family':
        return 'Family Connection';
      case 'overview':
      default:
        return 'Patient Control Room';
    }
  }

  switch (tab) {
    case 'dashboard':
      return 'Dashboard';
    case 'family-dashboard':
    case 'patient-overview':
      return 'Family Dashboard';
    case 'medications':
      return 'Medicines';
    case 'history':
      return 'History Timeline';
    case 'ai-assistant':
      return 'AI Assistant';
    case 'family':
      return 'Family Connections';
    case 'ocr-scanner':
    case 'ocr':
      return 'OCR Medicine Scanner';
    case 'analytics':
      return 'Adherence Analytics';
    case 'symptoms':
      return 'Symptom Journal';
    case 'documents':
    case 'medical-documents':
      return 'Medical Documents';
    case 'profile':
      return 'Profile';
    default:
      return tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ');
  }
};

interface NavigationProviderProps {
  children: React.ReactNode;
  initialTab?: string;
  initialSubView?: string;
  userRole?: 'PATIENT' | 'FAMILY_MEMBER';
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  initialTab = 'dashboard',
  initialSubView,
  userRole = 'PATIENT',
}) => {
  const location = useLocation();
  const routerNavigate = useRouterNavigate();
  const defaultHomeTab = userRole === 'PATIENT' ? 'dashboard' : 'family-dashboard';

  const getStateFromPath = useCallback(
    (pathname: string): { tab: string; subView?: string } => {
      const normalizedPath = pathname.replace(/\/+$/, '') || '/';
      if (normalizedPath === '/patient') return { tab: 'dashboard' };
      if (normalizedPath === '/family' || normalizedPath === '/family/dashboard') {
        return { tab: 'family-dashboard' };
      }
      if (normalizedPath === '/patient/medications') return { tab: 'medications' };
      if (normalizedPath === '/family/patient') return { tab: 'patient-overview' };
      if (normalizedPath === '/patient/history') return { tab: 'history' };
      if (normalizedPath === '/patient/ai') return { tab: 'ai-assistant' };
      if (normalizedPath === '/patient/connections' || normalizedPath === '/family/connections') {
        return { tab: 'family' };
      }
      if (normalizedPath === '/patient/ocr') return { tab: 'ocr-scanner' };
      if (normalizedPath === '/patient/documents') return { tab: 'documents' };
      if (normalizedPath === '/patient/profile' || normalizedPath === '/family/profile') {
        return { tab: 'profile' };
      }
      if (normalizedPath === '/patient/adherence') return { tab: 'analytics' };
      if (normalizedPath === '/patient/symptoms') return { tab: 'symptoms' };
      if (normalizedPath === '/patient/security') return { tab: 'control-room', subView: 'security' };
      if (normalizedPath === '/patient/security/devices') return { tab: 'control-room', subView: 'devices' };
      if (normalizedPath === '/patient/security/login-history') {
        return { tab: 'control-room', subView: 'login-history' };
      }
      if (normalizedPath === '/patient/security/session') return { tab: 'control-room', subView: 'auth' };
      if (normalizedPath === '/patient/notifications') {
        return { tab: 'control-room', subView: 'notifications' };
      }
      if (normalizedPath === '/patient/settings' || normalizedPath === '/family/settings') {
        return { tab: 'settings', subView: 'overview' };
      }
      return { tab: defaultHomeTab };
    },
    [defaultHomeTab]
  );

  const initialState = getStateFromPath(location.pathname);
  const [activeTab, setActiveTabState] = useState<string>(initialState.tab);
  const [activeSubView, setActiveSubViewState] = useState<string | undefined>(initialState.subView);
  const [historyStack, setHistoryStack] = useState<NavHistoryEntry[]>([]);
  const [params, setParams] = useState<Record<string, any>>({});

  useEffect(() => {
    const nextState = getStateFromPath(location.pathname);
    setActiveTabState(nextState.tab);
    setActiveSubViewState(nextState.subView);
  }, [getStateFromPath, location.pathname]);

  const getPathForState = (tab: string, subView?: string): string => {
    if (tab === 'dashboard') return '/patient';
    if (tab === 'family-dashboard') return '/family';
    if (tab === 'medications') return '/patient/medications';
    if (tab === 'patient-overview') return '/family/patient';
    if (tab === 'history') return '/patient/history';
    if (tab === 'ai-assistant' || tab === 'ai') return '/patient/ai';
    if (tab === 'family' || tab === 'family-connections') {
      return userRole === 'PATIENT' ? '/patient/connections' : '/family/connections';
    }
    if (tab === 'ocr-scanner' || tab === 'ocr') return '/patient/ocr';
    if (tab === 'analytics') return '/patient/adherence';
    if (tab === 'symptoms') return '/patient/symptoms';
    if (tab === 'documents' || tab === 'medical-documents') return '/patient/documents';
    if (tab === 'profile') return userRole === 'PATIENT' ? '/patient/profile' : '/family/profile';
    if (tab === 'settings') return userRole === 'PATIENT' ? '/patient/settings' : '/family/settings';
    if (tab === 'control-room') {
      if (subView === 'devices') return '/patient/security/devices';
      if (subView === 'login-history') return '/patient/security/login-history';
      if (subView === 'auth') return '/patient/security/session';
      if (subView === 'notifications') return '/patient/notifications';
      return '/patient/security';
    }
    return userRole === 'PATIENT' ? '/patient' : '/family';
  };

  // Navigate function that maintains stack and history
  const navigate = useCallback(
    (newTab: string, newSubView?: string, options?: NavigateOptions) => {
      // Don't push duplicate state if identical
      if (newTab === activeTab && newSubView === activeSubView && !options?.params) {
        return;
      }

      if (!options?.replace) {
        const currentEntry: NavHistoryEntry = {
          tab: activeTab,
          subView: activeSubView,
          label: getTabDisplayTitle(activeTab, activeSubView),
          params,
          timestamp: Date.now(),
        };

        setHistoryStack((prev) => {
          // Limit stack to last 30 entries to avoid memory bloat
          const updated = [...prev, currentEntry];
          return updated.slice(-30);
        });
      }

      setActiveTabState(newTab);
      setActiveSubViewState(newSubView);
      if (options?.params) {
        setParams(options.params);
      }

      routerNavigate(getPathForState(newTab, newSubView), {
        replace: options?.replace,
        state: { carepulseRoute: true },
      });
    },
    [activeTab, activeSubView, params, routerNavigate, userRole]
  );

  // Back Navigation handler
  const goBack = useCallback(() => {
    if (historyStack.length > 0) {
      setHistoryStack((prev) => prev.slice(0, -1));
    }
    if (location.state?.carepulseRoute) {
      routerNavigate(-1);
      return;
    }
    routerNavigate(getPathForState(defaultHomeTab));
  }, [historyStack.length, routerNavigate, defaultHomeTab, location.state]);

  const canGoBack =
    historyStack.length > 0 ||
    activeTab !== defaultHomeTab ||
    (activeTab === 'control-room' && Boolean(activeSubView && activeSubView !== 'overview'));

  const previousEntry = historyStack.length > 0 ? historyStack[historyStack.length - 1] : null;

  const getBackLabel = useCallback(
    (fallback?: string): string => {
      if (previousEntry && previousEntry.label) {
        return `Back to ${previousEntry.label}`;
      }
      if (activeTab === 'control-room' || activeTab === 'settings') {
        if (activeSubView && activeSubView !== 'overview') {
          return 'Back to Control Room';
        }
      }
      if (fallback) {
        return fallback;
      }
      if (activeTab !== defaultHomeTab) {
        return `Back to ${getTabDisplayTitle(defaultHomeTab)}`;
      }
      return 'Back';
    },
    [previousEntry, activeTab, activeSubView, defaultHomeTab]
  );

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        activeSubView,
        historyStack,
        params,
        navigate,
        goBack,
        canGoBack,
        previousEntry,
        getBackLabel,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
