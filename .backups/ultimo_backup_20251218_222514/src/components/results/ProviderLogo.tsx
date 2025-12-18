import React from 'react';
import { Building2 } from 'lucide-react';

interface ProviderLogoProps {
  provider: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

// Map provider names to brand colors and logos
const PROVIDER_STYLES: Record<string, { color: string; bgColor: string; textColor: string }> = {
  'enel': { color: '#00D35B', bgColor: '#00D35B', textColor: '#FFFFFF' },
  'sorgenia': { color: '#00A651', bgColor: '#00A651', textColor: '#FFFFFF' },
  'edison': { color: '#E4002B', bgColor: '#E4002B', textColor: '#FFFFFF' },
  'iren': { color: '#0066CC', bgColor: '#0066CC', textColor: '#FFFFFF' },
  'a2a': { color: '#003DA5', bgColor: '#003DA5', textColor: '#FFFFFF' },
  'acea': { color: '#0066B3', bgColor: '#0066B3', textColor: '#FFFFFF' },
  'eni': { color: '#FFD500', bgColor: '#FFD500', textColor: '#000000' },
  'plenitude': { color: '#FFD500', bgColor: '#FFD500', textColor: '#000000' },
  'hera': { color: '#0052A5', bgColor: '#0052A5', textColor: '#FFFFFF' },
  'illumia': { color: '#FF6600', bgColor: '#FF6600', textColor: '#FFFFFF' },
  'octopus': { color: '#E91E63', bgColor: '#E91E63', textColor: '#FFFFFF' },
  'wekiwi': { color: '#00C853', bgColor: '#00C853', textColor: '#FFFFFF' },
  'eon': { color: '#ED1C24', bgColor: '#ED1C24', textColor: '#FFFFFF' },
  'agsm': { color: '#0066CC', bgColor: '#0066CC', textColor: '#FFFFFF' },
  'default': { color: '#6B7280', bgColor: '#F3F4F6', textColor: '#1F2937' }
};

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base'
};

const LOGO_SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

export const ProviderLogo: React.FC<ProviderLogoProps> = ({ 
  provider, 
  size = 'md',
  showName = false 
}) => {
  // Normalize provider name
  const normalizedProvider = provider.toLowerCase().trim();
  
  // Find matching style
  let style = PROVIDER_STYLES['default'];
  for (const [key, value] of Object.entries(PROVIDER_STYLES)) {
    if (normalizedProvider.includes(key)) {
      style = value;
      break;
    }
  }

  // Get first letter for avatar
  const initial = provider.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div 
        className={`${SIZE_CLASSES[size]} rounded-full flex items-center justify-center font-bold shadow-sm border-2 border-white`}
        style={{ 
          backgroundColor: style.bgColor,
          color: style.textColor,
        }}
        title={provider}
      >
        {initial}
      </div>
      {showName && (
        <span className="font-semibold text-sm">{provider}</span>
      )}
    </div>
  );
};

// Alternative version with building icon for unknown providers
export const ProviderBadge: React.FC<ProviderLogoProps> = ({ 
  provider, 
  size = 'md' 
}) => {
  const normalizedProvider = provider.toLowerCase().trim();
  
  let style = PROVIDER_STYLES['default'];
  for (const [key, value] of Object.entries(PROVIDER_STYLES)) {
    if (normalizedProvider.includes(key)) {
      style = value;
      break;
    }
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium shadow-sm`}
      style={{ 
        backgroundColor: style.bgColor,
        color: style.textColor,
      }}
    >
      <Building2 className={LOGO_SIZE_CLASSES[size]} />
      <span>{provider}</span>
    </div>
  );
};
