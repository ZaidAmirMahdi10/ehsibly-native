import {createNavigationContainerRef} from '@react-navigation/native';

// A ref so notification-tap handlers (which run outside the React tree, e.g.
// from a cold start) can navigate. Passed to <NavigationContainer ref={...}>.
export const navigationRef = createNavigationContainerRef();

// A tap that cold-starts the app resolves before the navigator is mounted, so
// hold the intended destination and flush it once navigation is ready.
let pendingNavigation = null;

export const navigateWhenReady = (name, params) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    pendingNavigation = {name, params};
  }
};

// Called from <NavigationContainer onReady> to replay a queued navigation.
export const flushPendingNavigation = () => {
  if (pendingNavigation && navigationRef.isReady()) {
    const {name, params} = pendingNavigation;
    pendingNavigation = null;
    navigationRef.navigate(name, params);
  }
};
