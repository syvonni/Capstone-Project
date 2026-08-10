import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ConfigProvider, theme } from 'antd';
import { useLocation } from 'react-router-dom';
import { getCurrentUser, subscribeAuth } from '@/features/authentication/lib/authEvents.js';

const ThemeContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const THEMES = {
  DEFAULT: 'default',
  DARK: 'dark',
  SYSTEM: 'system',
  DOCUMENT: 'document',
  BLOSSOM: 'blossom',
  SUNSET: 'sunset',
  ROYAL: 'royal',
};

// eslint-disable-next-line react-refresh/only-export-components
export const BRAND_COLORS = {
  blue: '#0038A8',
  red: '#CE1126',
  yellow: '#FED141',
};

const themeConfig = {
  [THEMES.DEFAULT]: {
    name: 'Default',
    config: {
      algorithm: theme.defaultAlgorithm,
      token: {
        fontFamily: 'Urbanist, sans-serif',
        colorPrimary: BRAND_COLORS.blue,
        colorError: BRAND_COLORS.red,
        colorWarning: BRAND_COLORS.yellow,
        colorBorder: 'rgb(240, 240, 240)',
        // Ant Design preset colors
        colorPurple: '#722ed1',
        colorVolcano: '#fa541c',
        colorMagenta: '#eb2f96',
        colorCyan: '#13c2c2',
        colorGold: '#faad14',
        colorLime: '#a0d911',
        colorGeekblue: '#2f54eb',
        // Custom subtle background colors
        colorErrorBgSubtle: '#fff5f5',
        colorWarningBgSubtle: '#fefcf0',
      },
    },
  },
  [THEMES.DARK]: {
    name: 'Dark',
    config: {
      algorithm: theme.darkAlgorithm,
      token: {
        fontFamily: "'Urbanist', sans-serif",
        colorPrimary: '#177ddc', // Ant Design Dark Blue - Clearer on dark
        colorBgBase: '#141414', // Standard Dark Grey (Better for eyes than #000000)
        colorBgContainer: '#090909', // Lighter container
        colorBgElevated: '#1f1f1f', // Elevated background for popups (toasts, notifications, modals)
        colorBgLayout: '#000000', // Deep black for layout background
        colorTextBase: 'rgba(255, 255, 255, 0.85)', // High readability but not harsh
        colorBorder: '#232323',
        colorBorderSecondary: '#232323',
        // Ant Design preset colors (lighter versions for dark theme)
        colorPurple: '#9254de',
        colorVolcano: '#ff7a45',
        colorMagenta: '#f759ab',
        colorCyan: '#13c2c2',
        colorGold: '#faad14',
        colorLime: '#a0d911',
        colorGeekblue: '#2f54eb',
        // Custom subtle background colors for dark mode
        colorErrorBgSubtle: '#1b0b0b',
        colorWarningBgSubtle: '#151008',
      },
      components: {
        Layout: {
          headerBg: '#141414',
          bodyBg: '#000000',
          siderBg: '#141414',
        },
        Card: {
          colorBgContainer: '#090909', // Distinct card background
        },
        Table: {
          colorBgContainer: '#090909',
        },
        Menu: {
          darkItemBg: '#141414',
        }
      }
    },
  },
  [THEMES.DOCUMENT]: {
    name: 'Document',
    config: {
      algorithm: theme.defaultAlgorithm,
      token: {
        fontFamily: "'Urbanist', sans-serif",
        colorPrimary: '#00B96B', // Custom Green
        colorBgLayout: '#E5F8F0', // Light green background
        colorBgContainer: '#ffffff',
        borderRadius: 0, // Sharp edges for document feel
        wireframe: true, // clearer borders
        // Ant Design preset colors
        colorPurple: '#722ed1',
        colorVolcano: '#fa541c',
        colorMagenta: '#eb2f96',
        colorCyan: '#13c2c2',
        colorGold: '#faad14',
        colorLime: '#a0d911',
        colorGeekblue: '#2f54eb',
      },
      components: {
        Layout: {
          headerBg: '#E5F8F0',
          siderBg: '#E5F8F0',
        }
      }
    },
  },
  [THEMES.BLOSSOM]: {
    name: 'Blossom',
    config: {
      algorithm: theme.defaultAlgorithm,
      token: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        colorPrimary: '#eb2f96',
        colorBgLayout: '#fff0f6',
        colorBgContainer: '#ffffff',
        colorLink: '#eb2f96',
        borderRadius: 8, // Softer edges
        // Ant Design preset colors
        colorPurple: '#722ed1',
        colorVolcano: '#fa541c',
        colorMagenta: '#eb2f96',
        colorCyan: '#13c2c2',
        colorGold: '#faad14',
        colorLime: '#a0d911',
        colorGeekblue: '#2f54eb',
      },
      components: {
        Layout: {
          headerBg: '#ffffff', // Clean header
        }
      }
    },
  },
  [THEMES.SUNSET]: {
    name: 'Sunset',
    config: {
      algorithm: theme.defaultAlgorithm,
      token: {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        colorPrimary: '#fa541c', // Volcano
        colorBgLayout: '#fff2e8', // Light volcano background
        colorBgContainer: '#ffffff',
        colorLink: '#fa541c',
        borderRadius: 6,
        // Ant Design preset colors
        colorPurple: '#722ed1',
        colorVolcano: '#fa541c',
        colorMagenta: '#eb2f96',
        colorCyan: '#13c2c2',
        colorGold: '#faad14',
        colorLime: '#a0d911',
        colorGeekblue: '#2f54eb',
      },
      components: {
        Layout: {
          headerBg: '#fff2e8',
          siderBg: '#fff2e8',
        }
      }
    },
  },
  [THEMES.ROYAL]: {
    name: 'Royal',
    config: {
      algorithm: theme.defaultAlgorithm,
      token: {
        fontFamily: "'Urbanist', sans-serif",
        colorPrimary: '#722ed1', // Purple
        colorBgLayout: '#f9f0ff', // Light purple background
        colorBgContainer: '#ffffff',
        colorLink: '#722ed1',
        borderRadius: 12,
        // Ant Design preset colors
        colorPurple: '#722ed1',
        colorVolcano: '#fa541c',
        colorMagenta: '#eb2f96',
        colorCyan: '#13c2c2',
        colorGold: '#faad14',
        colorLime: '#a0d911',
        colorGeekblue: '#2f54eb',
      },
      components: {
        Layout: {
          headerBg: '#f9f0ff',
          siderBg: '#f9f0ff',
        }
      }
    },
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values instead of throwing to handle error boundary recovery
    return {
      currentTheme: THEMES.DEFAULT,
      savedTheme: THEMES.DEFAULT,
      setTheme: () => {},
      setPreviewTheme: () => {},
      themeOverrides: {},
      setThemeOverrides: () => {},
      replaceThemeOverrides: () => {},
      setPreviewOverrides: () => {},
      availableThemes: themeConfig,
    };
  }
  return context;
};

// Helper functions for user-specific theme storage
// Use user ID as primary identifier since it doesn't change when email changes
function getThemeStorageKey(user) {
  if (!user?.id && !user?.email) return 'app_theme_guest';
  // Prefer ID over email since ID doesn't change when email changes
  const identifier = user.id || user.email;
  return `app_theme_${identifier}`;
}

function getOverridesStorageKey(user) {
  if (!user?.id && !user?.email) return 'theme_overrides_guest';
  // Prefer ID over email since ID doesn't change when email changes
  const identifier = user.id || user.email;
  return `theme_overrides_${identifier}`;
}

// Migrate theme from old email to new ID when email changes
function migrateThemeFromEmail(oldEmail, newUser) {
  if (!oldEmail || !newUser?.id) return;
  
  const oldThemeKey = `app_theme_${oldEmail}`;
  const oldOverridesKey = `theme_overrides_${oldEmail}`;
  const newThemeKey = getThemeStorageKey(newUser);
  const newOverridesKey = getOverridesStorageKey(newUser);
  
  try {
    // Migrate theme
    const oldTheme = localStorage.getItem(oldThemeKey);
    if (oldTheme && !localStorage.getItem(newThemeKey)) {
      localStorage.setItem(newThemeKey, oldTheme);
      localStorage.removeItem(oldThemeKey);
    }
    
    // Migrate overrides
    const oldOverrides = localStorage.getItem(oldOverridesKey);
    if (oldOverrides && !localStorage.getItem(newOverridesKey)) {
      localStorage.setItem(newOverridesKey, oldOverrides);
      localStorage.removeItem(oldOverridesKey);
    }
  } catch { /* ignore migration errors */ }
}

function loadUserTheme(user) {
  const key = getThemeStorageKey(user);
  const saved = localStorage.getItem(key);
  return Object.values(THEMES).includes(saved) ? saved : THEMES.DEFAULT;
}

function loadUserOverrides(user) {
  const key = getOverridesStorageKey(user);
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveUserTheme(user, theme) {
  const key = getThemeStorageKey(user);
  localStorage.setItem(key, theme);
}

function saveUserOverrides(user, overrides) {
  const key = getOverridesStorageKey(user);
  localStorage.setItem(key, JSON.stringify(overrides));
}

// Helper function to read user from storage (similar to useAuthSession)
function readStoredUser() {
  const LOCAL_KEY = 'auth__currentUser'
  const SESSION_KEY = 'auth__sessionUser'
  try {
    // Prefer remembered local storage (longer-lived)
    const localRaw = localStorage.getItem(LOCAL_KEY)
    if (localRaw) {
      const parsed = JSON.parse(localRaw)
      const user = parsed?.user ?? parsed // backward compat if plain user is stored
      const expiresAt = parsed?.expiresAt ?? 0
      if (!expiresAt || Date.now() < expiresAt) {
        return user
      }
    }
  } catch { /* ignore */ }
  try {
    // Then check session storage (shorter-lived, tab-bound)
    const sessionRaw = sessionStorage.getItem(SESSION_KEY)
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw)
      const user = parsed?.user ?? parsed
      const expiresAt = parsed?.expiresAt ?? 0
      if (!expiresAt || Date.now() < expiresAt) {
        return user
      }
    }
  } catch { /* ignore */ }
  return null
}

export function ThemeProvider({ children }) {
  const location = useLocation();
  const PUBLIC_PATHS = ['/', '/login', '/sign-up', '/forgot-password', '/terms', '/privacy'];
  const isPublicPage = PUBLIC_PATHS.includes(location.pathname);

  // Track current user to scope theme storage
  // Initialize from both getCurrentUser() and storage to ensure we have user on refresh
  const [currentUser, setCurrentUser] = useState(() => {
    const fromMemory = getCurrentUser()
    if (fromMemory) return fromMemory
    // If not in memory, try reading from storage
    return readStoredUser()
  });
  
  // Initialize theme from user-specific storage
  // Always load theme based on currentUser (even if null, will use guest theme)
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Get the actual user (from memory or storage) to load theme
    const user = getCurrentUser() || readStoredUser()
    return loadUserTheme(user);
  });

  // Preview theme allows showing a theme temporarily without persisting it (e.g. on hover)
  const [previewTheme, setPreviewTheme] = useState(null);
  const [previewOverrides, setPreviewOverrides] = useState(null);

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
  });

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const handler = (e) => setSystemPrefersDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // The theme to actually render — resolve "system" to default/dark based on OS preference
  const resolvedTheme = (() => {
    const base = previewTheme || currentTheme
    if (base === THEMES.SYSTEM) return systemPrefersDark ? THEMES.DARK : THEMES.DEFAULT
    return base
  })();
  const displayTheme = isPublicPage ? THEMES.DEFAULT : resolvedTheme;

  // Set CSS variables for message/notification background colors (workaround for Ant Design 5 bug)
  useEffect(() => {
    const root = document.documentElement;
    const isDark = displayTheme === THEMES.DARK;
    
    if (isDark) {
      root.style.setProperty('--message-bg', '#1f1f1f');
      root.style.setProperty('--message-text', 'rgb(255 255 255 / 85%)');
      root.style.setProperty('--notification-bg', '#1f1f1f');
      root.style.setProperty('--notification-text', 'rgb(255 255 255 / 85%)');
      root.style.setProperty('--scrollbar-thumb', 'rgb(255 255 255 / 10%)');
      root.style.setProperty('--scrollbar-thumb-hover', 'rgb(255 255 255 / 30%)');
      root.style.setProperty('--scrollbar-track', 'rgb(255 255 255 / 2%)');
    } else {
      root.style.setProperty('--message-bg', '#fff');
      root.style.setProperty('--message-text', 'rgb(0 0 0 / 88%)');
      root.style.setProperty('--notification-bg', '#fff');
      root.style.setProperty('--notification-text', 'rgb(0 0 0 / 88%)');
      root.style.setProperty('--scrollbar-thumb', 'rgb(0 0 0 / 10%)');
      root.style.setProperty('--scrollbar-thumb-hover', 'rgb(0 0 0 / 30%)');
      root.style.setProperty('--scrollbar-track', 'rgb(0 0 0 / 1%)');
    }
  }, [displayTheme]);

  // Store custom theme overrides (primary color, border radius, etc.)
  const [themeOverrides, setThemeOverrides] = useState(() => {
    // Get the actual user (from memory or storage) to load overrides
    const user = getCurrentUser() || readStoredUser()
    return loadUserOverrides(user);
  });
  
  // Subscribe to auth changes to detect login/logout/account switch
  useEffect(() => {
    // On mount, if we have a user in storage but not in memory, sync it
    const storedUser = readStoredUser()
    if (storedUser && !getCurrentUser()) {
      setCurrentUser(storedUser)
    }
    
    let previousUserEmail = currentUser?.email;
    
    const unsubscribe = subscribeAuth((user) => {
      // If email changed, migrate theme from old email to new ID
      if (previousUserEmail && user?.email && previousUserEmail !== user.email && user?.id) {
        migrateThemeFromEmail(previousUserEmail, user);
      }
      
      setCurrentUser(user);
      previousUserEmail = user?.email;
      
      // When user changes, load their theme
      const userTheme = loadUserTheme(user);
      const userOverrides = loadUserOverrides(user);
      setCurrentTheme(userTheme);
      setThemeOverrides(userOverrides);
      // Clear any previews when user changes
      setPreviewTheme(null);
      setPreviewOverrides(null);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived overrides: disable overrides on public pages
  // If previewOverrides is set, use it instead of saved themeOverrides
  const activeOverrides = useMemo(() => {
    return isPublicPage ? {} : (previewOverrides || themeOverrides);
  }, [isPublicPage, previewOverrides, themeOverrides]);

  // Save theme to user-specific storage when theme or user changes
  // Save for both logged-in users and guests to ensure persistence
   
  useEffect(() => {
    // Always save theme, even for guest users (null currentUser)
    saveUserTheme(currentUser, currentTheme);
    saveUserOverrides(currentUser, themeOverrides);
  }, [currentTheme, themeOverrides, currentUser]);

  useEffect(() => {
    // Update global CSS variables for fonts and colors to match the selected theme
    const themeData = themeConfig[displayTheme];
    // Merge base token with overrides
    const token = { ...themeData.config.token, ...activeOverrides };
    const fontFamily = token.fontFamily;
    
    // Update fonts
    if (fontFamily) {
      document.documentElement.style.setProperty('--font-family', fontFamily);
      
      if (fontFamily.includes('Georgia')) {
         document.documentElement.style.setProperty('--heading-font-family', fontFamily);
      } else if (fontFamily.includes('Urbanist')) {
         document.documentElement.style.setProperty('--heading-font-family', "'Urbanist', sans-serif");
      } else {
         document.documentElement.style.setProperty('--heading-font-family', fontFamily);
      }
    }

    // Update global body background and text color
    // If specific colors are not defined in the theme token (like for Default/V4), fall back to standard light mode values
    const bodyBg = token.colorBgLayout || '#f0f2f5'; // Default AntD Layout bg

    // Always use the theme's defined layout background for the global body background
    // This ensures consistency across all themes (Dark, Document, Blossom, etc.)
    document.documentElement.style.setProperty('--body-background', bodyBg);
    
    // For Dark theme specifically, we want the body to be pitch black to match the layout
    // if the token specifies it, otherwise fallback to the calculated bodyBg
    if (displayTheme === THEMES.DARK) {
       // Check if we have a specific bodyBg override in components
       const layoutBodyBg = themeData.config?.components?.Layout?.bodyBg;
       if (layoutBodyBg) {
           document.documentElement.style.setProperty('--body-background', layoutBodyBg);
       }
       document.documentElement.style.setProperty('--body-text', 'rgba(255, 255, 255, 0.85)');
    } else {
       // For light themes, ensure text is dark
       document.documentElement.style.setProperty('--body-text', '#1f1f1f');
    }

  }, [displayTheme, activeOverrides]);

  const updateThemeOverrides = (updates) => {
    setThemeOverrides(prev => ({ ...prev, ...updates }));
  };

  const value = {
    currentTheme: displayTheme, // Expose the displayed theme as currentTheme so consumers see the preview
    savedTheme: currentTheme,   // The actual saved theme (if needed)
    setTheme: setCurrentTheme,
    setPreviewTheme,            // Allow consumers to set preview
    themeOverrides,
    setThemeOverrides: updateThemeOverrides,
    replaceThemeOverrides: setThemeOverrides, // Allow complete replacement of overrides
    setPreviewOverrides,        // Allow consumers to preview overrides
    availableThemes: themeConfig,
  };

  // Merge base config with overrides
  const activeThemeConfig = themeConfig[displayTheme];
  
  // Logic to handle "Navy on Navy" visibility issue in Sidebar
  // If the user selects the Navy color (#001529) as primary, it matches the Default sidebar background.
  // We need to override the Menu component tokens to ensure the active state is visible.
  const effectivePrimary = activeOverrides.colorPrimary || activeThemeConfig.config.token.colorPrimary;
  const isNavyPrimary = effectivePrimary === '#001529';
  
  // Custom component overrides for Navy primary color
  const navyColorOverrides = isNavyPrimary ? {
    Menu: {
      // For Dark menu (sidebar), use a transparent white background instead of the primary color (which is navy and invisible)
      darkItemSelectedBg: 'rgba(255, 255, 255, 0.1)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
      // Ensure text is white
      darkItemSelectedColor: '#ffffff',
    },
    Select: {
      // Fix hover state readability - use a lighter background for option hover
      optionActiveBg: '#e6f4ff', // Light blue background on hover
      optionSelectedBg: '#bae0ff', // Slightly darker for selected
      optionSelectedColor: '#001529', // Navy text for selected (readable on light bg)
    },
  } : {};

  // Font override for Message/Toast component to ensure it uses Urbanist
  const messageFontOverride = {
    Message: {
      fontFamily: activeThemeConfig.config.token.fontFamily,
      contentBg: activeThemeConfig.config.token.colorBgElevated || activeThemeConfig.config.token.colorBgContainer,
      colorText: activeThemeConfig.config.token.colorTextBase,
    },
  };

  // Modal override to ensure confirmation modal buttons respect theme colorPrimary
  const modalOverride = {
    Modal: {
      fontFamily: activeThemeConfig.config.token.fontFamily,
    },
  };

  // Notification override to ensure notifications respect theme colors
  const notificationOverride = {
    Notification: {
      colorBgElevated: activeThemeConfig.config.token.colorBgElevated || activeThemeConfig.config.token.colorBgContainer,
      colorText: activeThemeConfig.config.token.colorTextBase,
      colorTextHeading: activeThemeConfig.config.token.colorTextBase,
    },
  };

  let algorithm = activeThemeConfig.config.algorithm;
  if (activeOverrides.compact) {
     if (Array.isArray(algorithm)) {
        algorithm = [...algorithm, theme.compactAlgorithm];
     } else {
        algorithm = [algorithm, theme.compactAlgorithm];
     }
  }

  const mergedConfig = {
    ...activeThemeConfig.config,
    algorithm,
    token: {
      ...activeThemeConfig.config.token,
      ...activeOverrides,
    },
    components: {
      ...activeThemeConfig.config.components,
      ...navyColorOverrides,
      ...messageFontOverride,
      ...modalOverride,
      ...notificationOverride,
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider theme={mergedConfig}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
