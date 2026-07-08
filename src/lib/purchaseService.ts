// Service for managing Android In-App Purchases (IAP) with PlayStore binding
// Designed to support standard Capacitor integrations when wrapped into an APK,
// and gracefully falls back to simulated secure PlayStore environment in standard web browsers.

export interface PurchaseProduct {
  id: string;
  price: string;
  title: string;
  description: string;
}

export class PurchaseService {
  private static STORAGE_KEY = 'music_app_premium_status';

  /**
   * Check if the application is running inside a Capacitor Native Android wrapper
   */
  public static isNativeAndroid(): boolean {
    const win = window as any;
    return !!(win.Capacitor && win.Capacitor.platform === 'android');
  }

  /**
   * Get the persisted premium status from local storage
   */
  public static getPremiumStatus(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'true';
  }

  /**
   * Set the premium status
   */
  public static setPremiumStatus(status: boolean): void {
    localStorage.setItem(this.STORAGE_KEY, status ? 'true' : 'false');
  }

  /**
   * Initialize connection with Google Play Billing Client
   */
  public static async initializeBilling(): Promise<boolean> {
    if (!this.isNativeAndroid()) {
      console.log("[Billing] Running in web simulator mode. Ready for transaction simulation.");
      return true;
    }

    try {
      const win = window as any;
      if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.Purchases) {
        // Safe check for Capgo/Purchases plugin
        const Purchases = win.Capacitor.Plugins.Purchases;
        await Purchases.configure({
          apiKey: "playstore_billing_client_direct_binding"
        });
        console.log("[Billing] Native Android PlayStore Billing Initialized Successfully.");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Billing] Failed to initialize native billing client:", err);
      return false;
    }
  }

  /**
   * Trigger a real PlayStore purchase flow for the premium subscription
   * Falls back to high-fidelity simulation if running in a web sandbox
   */
  public static async purchasePremium(productId: string = "premium_monthly"): Promise<{ success: boolean; message: string }> {
    if (!this.isNativeAndroid()) {
      return {
        success: true,
        message: "Simulated Web PlayStore Checkout successful."
      };
    }

    try {
      const win = window as any;
      if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.Purchases) {
        const Purchases = win.Capacitor.Plugins.Purchases;
        
        // Call purchase product directly invoking Google Play In-App Purchase UI
        const result = await Purchases.purchaseProduct({ productId });
        
        if (result && result.transactionId) {
          this.setPremiumStatus(true);
          return {
            success: true,
            message: `Purchase successful! Google Play Transaction: ${result.transactionId}`
          };
        }
      }
      return {
        success: false,
        message: "Billing plugin is not configured or user cancelled."
      };
    } catch (err: any) {
      console.error("[Billing] Native PlayStore purchase crashed:", err);
      return {
        success: false,
        message: err.message || "Unknown PlayStore purchase error."
      };
    }
  }

  /**
   * Restore previous purchases from Google Play Store account
   */
  public static async restorePurchases(): Promise<boolean> {
    if (!this.isNativeAndroid()) {
      console.log("[Billing] Simulated purchase restore completed.");
      return this.getPremiumStatus();
    }

    try {
      const win = window as any;
      if (win.Capacitor && win.Capacitor.Plugins && win.Capacitor.Plugins.Purchases) {
        const Purchases = win.Capacitor.Plugins.Purchases;
        const result = await Purchases.restorePurchases();
        if (result && result.purchases && result.purchases.length > 0) {
          this.setPremiumStatus(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("[Billing] Native restore failed:", err);
      return false;
    }
  }
}
