import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesPackage,
} from 'react-native-purchases';
import Purchases from 'react-native-purchases';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  hasActivePlus,
  purchaseMonthlyPackage,
  resolveMonthlyOffering,
  restorePlusEntitlement,
  type MonthlyOfferingResult,
} from '@/lib/revenuecat-core';
import { revenueCatMode, type RevenueCatMode } from '@/lib/revenuecat';

export type RevenueCatActionStatus =
  | 'cancelled'
  | 'failed'
  | 'idle'
  | 'preview-only'
  | 'purchase-in-progress'
  | 'restored'
  | 'restore-in-progress'
  | 'restore-not-found'
  | 'successful';

export type RevenueCatOfferingStatus =
  'available' | 'error' | 'loading' | 'unavailable';

type RevenueCatContextValue = {
  actionStatus: RevenueCatActionStatus;
  currentOfferingIdentifier: string | null;
  currentOfferingLoaded: boolean;
  isConfigured: boolean;
  isCustomerInfoLoading: boolean;
  isExpoGoPreview: boolean;
  isPlusActive: boolean;
  mode: RevenueCatMode;
  monthlyPrice: string | null;
  offeringIssue: MonthlyOfferingResult['reason'] | 'load-error' | null;
  offeringStatus: RevenueCatOfferingStatus;
  purchasePlus: () => Promise<void>;
  refreshCustomerInfo: () => Promise<boolean>;
  reload: () => Promise<void>;
  restorePurchases: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

function isConfiguredMode(mode: RevenueCatMode) {
  return mode === 'native' || mode === 'preview';
}

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const isConfigured = isConfiguredMode(revenueCatMode);
  const isExpoGoPreview = revenueCatMode === 'preview';
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(
    null,
  );
  const [currentOfferingLoaded, setCurrentOfferingLoaded] = useState(false);
  const [currentOfferingIdentifier, setCurrentOfferingIdentifier] = useState<
    string | null
  >(null);
  const [reportedPlusActive, setReportedPlusActive] = useState(false);
  const [isCustomerInfoLoading, setIsCustomerInfoLoading] = useState(true);
  const [offeringStatus, setOfferingStatus] =
    useState<RevenueCatOfferingStatus>('loading');
  const [offeringIssue, setOfferingIssue] =
    useState<RevenueCatContextValue['offeringIssue']>(null);
  const [actionStatus, setActionStatus] =
    useState<RevenueCatActionStatus>('idle');

  // Preview API Mode can report simulated values. Only native CustomerInfo can
  // unlock a paid benefit.
  const isPlusActive = revenueCatMode === 'native' && reportedPlusActive;

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo) => {
    setReportedPlusActive(hasActivePlus(customerInfo));
    setIsCustomerInfoLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (!isConfigured) {
      setIsCustomerInfoLoading(false);
      setOfferingStatus('unavailable');
      return;
    }

    setIsCustomerInfoLoading(true);
    setOfferingStatus('loading');
    setOfferingIssue(null);

    const [customerInfoResult, offeringsResult] = await Promise.allSettled([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);

    if (customerInfoResult.status === 'fulfilled') {
      applyCustomerInfo(customerInfoResult.value);
    } else {
      setReportedPlusActive(false);
      setIsCustomerInfoLoading(false);
    }

    if (offeringsResult.status === 'fulfilled') {
      const currentOffering = offeringsResult.value.current;
      const result = resolveMonthlyOffering(offeringsResult.value);

      setCurrentOfferingLoaded(result.currentOfferingLoaded);
      setCurrentOfferingIdentifier(currentOffering?.identifier ?? null);
      setMonthlyPackage(result.monthlyPackage);
      setOfferingIssue(result.reason);
      setOfferingStatus(result.monthlyPackage ? 'available' : 'unavailable');
    } else {
      setCurrentOfferingLoaded(false);
      setCurrentOfferingIdentifier(null);
      setMonthlyPackage(null);
      setOfferingIssue('load-error');
      setOfferingStatus('error');
    }
  }, [applyCustomerInfo, isConfigured]);

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      void reload();
    }, 0);

    return () => clearTimeout(initialLoad);
  }, [reload]);

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const listener: CustomerInfoUpdateListener = (customerInfo) => {
      applyCustomerInfo(customerInfo);
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [applyCustomerInfo, isConfigured]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!isConfigured) {
      return false;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      applyCustomerInfo(customerInfo);
      return revenueCatMode === 'native' && hasActivePlus(customerInfo);
    } catch {
      return isPlusActive;
    }
  }, [applyCustomerInfo, isConfigured, isPlusActive]);

  const purchasePlus = useCallback(async () => {
    if (isExpoGoPreview) {
      setActionStatus('preview-only');
      return;
    }

    if (!isConfigured || !monthlyPackage) {
      setActionStatus('failed');
      return;
    }

    setActionStatus('purchase-in-progress');
    const outcome = await purchaseMonthlyPackage(() =>
      Purchases.purchasePackage(monthlyPackage),
    );

    if (outcome.status === 'successful') {
      applyCustomerInfo(outcome.customerInfo as CustomerInfo);
      setActionStatus('successful');
    } else {
      setActionStatus(outcome.status);
    }
  }, [applyCustomerInfo, isConfigured, isExpoGoPreview, monthlyPackage]);

  const restorePurchases = useCallback(async () => {
    if (isExpoGoPreview) {
      setActionStatus('preview-only');
      return;
    }

    if (!isConfigured) {
      setActionStatus('failed');
      return;
    }

    setActionStatus('restore-in-progress');
    const outcome = await restorePlusEntitlement(() =>
      Purchases.restorePurchases(),
    );

    if (outcome.status === 'restored' || outcome.status === 'not-found') {
      applyCustomerInfo(outcome.customerInfo as CustomerInfo);
      setActionStatus(
        outcome.status === 'restored' ? 'restored' : 'restore-not-found',
      );
    } else {
      setActionStatus('failed');
    }
  }, [applyCustomerInfo, isConfigured, isExpoGoPreview]);

  useEffect(() => {
    if (__DEV__) {
      console.info('[FoundIt] RevenueCat status', {
        currentOfferingLoaded,
        plusActive: isPlusActive,
        sdkConfigured: isConfigured,
      });
    }
  }, [currentOfferingLoaded, isConfigured, isPlusActive]);

  const value = useMemo<RevenueCatContextValue>(
    () => ({
      actionStatus,
      currentOfferingIdentifier,
      currentOfferingLoaded,
      isConfigured,
      isCustomerInfoLoading,
      isExpoGoPreview,
      isPlusActive,
      mode: revenueCatMode,
      monthlyPrice: monthlyPackage?.product.priceString ?? null,
      offeringIssue,
      offeringStatus,
      purchasePlus,
      refreshCustomerInfo,
      reload,
      restorePurchases,
    }),
    [
      actionStatus,
      currentOfferingIdentifier,
      currentOfferingLoaded,
      isConfigured,
      isCustomerInfoLoading,
      isExpoGoPreview,
      isPlusActive,
      monthlyPackage?.product.priceString,
      offeringIssue,
      offeringStatus,
      purchasePlus,
      refreshCustomerInfo,
      reload,
      restorePurchases,
    ],
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);

  if (!context) {
    throw new Error('useRevenueCat must be used inside RevenueCatProvider.');
  }

  return context;
}
