import Constants, { AppOwnership } from 'expo-constants';
import Purchases from 'react-native-purchases';

export type RevenueCatMode =
  'error' | 'invalid-preview-key' | 'native' | 'preview' | 'unconfigured';

let configuredMode: RevenueCatMode | null = null;

function isPlaceholderKey(apiKey: string) {
  return apiKey.includes('replace_with');
}

export function initializeRevenueCat(): RevenueCatMode {
  if (configuredMode) {
    return configuredMode;
  }

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();

  if (!apiKey || isPlaceholderKey(apiKey)) {
    configuredMode = 'unconfigured';
    return configuredMode;
  }

  const isExpoGo = Constants.appOwnership === AppOwnership.Expo;
  const isPreviewCompatible =
    apiKey.startsWith('test_') || apiKey.startsWith('rcb_');

  if (isExpoGo && !isPreviewCompatible) {
    configuredMode = 'invalid-preview-key';
    return configuredMode;
  }

  try {
    Purchases.configure({ apiKey });
    configuredMode = isExpoGo ? 'preview' : 'native';
  } catch {
    configuredMode = 'error';
  }

  return configuredMode;
}

export const revenueCatMode = initializeRevenueCat();
