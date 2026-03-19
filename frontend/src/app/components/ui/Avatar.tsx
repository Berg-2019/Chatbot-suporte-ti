import { User } from 'lucide-react';
import { useState } from 'react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({ src, alt, fallbackText, size = 'md', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Get initials from fallbackText
  const getInitials = (text?: string): string => {
    if (!text) return '?';
    const words = text.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const showFallback = !src || imageError || imageLoading;

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: showFallback ? 'var(--cw-bg-tertiary)' : 'transparent',
      }}
    >
      {src && !imageError ? (
        <>
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={src}
            alt={alt || fallbackText || 'Avatar'}
            className={`w-full h-full object-cover transition-opacity ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
            onLoad={() => setImageLoading(false)}
          />
        </>
      ) : fallbackText ? (
        <span
          className="font-semibold select-none"
          style={{ color: 'var(--cw-text-secondary)' }}
        >
          {getInitials(fallbackText)}
        </span>
      ) : (
        <User
          className="w-1/2 h-1/2"
          style={{ color: 'var(--cw-text-tertiary)' }}
        />
      )}
    </div>
  );
}
