
import React, { useEffect, useState } from 'react';

interface BrandLogoProps {
  variant: 'header' | 'footer' | 'landing-nav';
  className?: string;
  defaultTextClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant, className = "", defaultTextClassName = "text-white" }) => {
  const [settings, setSettings] = useState<{ footerLogoUrl?: string, headerLogoUrl?: string } | null>(null);

  useEffect(() => {
    fetch('/site-settings.json')
      .then(res => res.json())
      .catch(err => console.debug('No site settings found', err));
  }, []);

  // Default Logo UI (The SVG + Text combo)
  const DefaultLogo = (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="bg-indigo-600 p-2 rounded-lg">
        <svg className={`w-5 h-5 ${defaultTextClassName}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <span className={`text-xl font-bold tracking-tight ${defaultTextClassName}`}>8<span className="text-indigo-400">ME</span></span>
    </div>
  );

  const SimpleTextLogo = (
    <span className={`text-lg font-bold tracking-tight ${defaultTextClassName}`}>8<span className="text-indigo-400">ME</span></span>
  );

  // Check for Custom Footer Logo
  if (variant === 'footer' && settings?.footerLogoUrl) {
    return <img src={settings.footerLogoUrl} alt="Footer Logo" className={`h-10 w-auto object-contain ${className}`} />;
  }

  // Check for Custom Header Logo
  if ((variant === 'header' || variant === 'landing-nav') && settings?.headerLogoUrl) {
    return <img src={settings.headerLogoUrl} alt="Logo" className={`h-10 w-auto object-contain ${className}`} />;
  }

  // Fallbacks
  if (variant === 'footer') {
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
            {SimpleTextLogo}
        </div>
      );
  }

  return DefaultLogo;
};
