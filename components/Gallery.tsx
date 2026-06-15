
// This component is being deprecated as the mapping logic is now handled directly in App.tsx
// to support the edit callback more easily without prop drilling through an extra layer.
// If you wish to keep it, you must add the onEdit prop to its interface.
import React from 'react';
import type { Asset } from '../types';
import { VariantCard } from './VariantCard';

interface GalleryProps {
  assets: Asset[];
  T: any;
  onAnimate: (asset: Asset) => void;
  onRegenerate: (asset: Asset) => void;
  onReset: (asset: Asset) => void;
  onFeedback: (assetId: string, feedback: 'like' | 'dislike') => void;
  onEdit?: (asset: Asset, prompt: string) => Promise<void>;
}

export const Gallery: React.FC<GalleryProps> = ({ assets, T, onAnimate, onRegenerate, onReset, onFeedback, onEdit }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {assets.map((asset) => (
        <VariantCard 
          key={asset.id} 
          asset={asset} 
          T={T} 
          onAnimate={onAnimate}
          onRegenerate={onRegenerate}
          onReset={onReset}
          onFeedback={onFeedback}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};
