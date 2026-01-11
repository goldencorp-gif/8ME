
export interface StripeConfig {
  starterLink: string;
  growthLink: string;
  enterpriseLink: string;
  customerPortalLink: string;
}

export const getStripeConfig = async (): Promise<StripeConfig> => {
  try {
    const res = await fetch('/site-settings.json');
    const data = await res.json();
    return data.stripe || {
      starterLink: '#',
      growthLink: '#',
      enterpriseLink: '#',
      customerPortalLink: '#'
    };
  } catch (error) {
    console.error('Failed to load Stripe config', error);
    return {
      starterLink: '#',
      growthLink: '#',
      enterpriseLink: '#',
      customerPortalLink: '#'
    };
  }
};
