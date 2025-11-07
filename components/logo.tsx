import { Fingerprint } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-lg bg-indigo-600 flex items-center justify-center text-white`}>
        <Fingerprint className={`${size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'}`} />
      </div>
      {showText && (
        <span className={`font-bold ${textSizeClasses[size]} ${className.includes('text-white') ? 'text-white' : 'text-gray-900'}`}>
          ADMS
        </span>
      )}
    </div>
  );
}

