// These previously pointed at the legacy "Package S/M/L" Stripe products,
// which charge 29.99/79.99/149 EUR per month - not the 149/249/349 EUR
// advertised on the registration/pricing page (CompanyRegistration.tsx,
// subscriptionPlans). Every customer who upgraded through this link would
// have been billed the wrong amount. These now point to the real "Paket
// S/M/L HSE Basic/Pro/Enterprise" products at the advertised prices.
export const STRIPE_PAYMENT_LINKS = {
  basic: {
    monthly: "https://buy.stripe.com/eVq6oG37ga732V921TeME0c", // Paket S HSE Basic - 149 EUR/month
    yearly: "https://buy.stripe.com/cNi3cu37gbb70N1dKBeME0f",  // Paket S HSE Basic - 1490 EUR/year
  },
  standard: {
    monthly: "https://buy.stripe.com/bJe7sKcHQ2EB0N18qheME0d", // Paket M HSE Pro - 249 EUR/month
    yearly: "https://buy.stripe.com/eVqeVc0Z8a738ft7mdeME0g",  // Paket M HSE Pro - 2490 EUR/year
  },
  premium: {
    monthly: "https://buy.stripe.com/eVqeVccHQ1Ax9jxbCteME0e", // Paket L HSE Enterprise - 349 EUR/month
    yearly: "https://buy.stripe.com/8x2fZg37gbb70N1fSJeME0h",  // Paket L HSE Enterprise - 3490 EUR/year
  }
} as const;
