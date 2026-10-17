import React from 'react';

interface PriceDisplayProps {
  amount: number | string;
  className?: string;
  pesoClassName?: string;
  digitsClassName?: string;
}

/**
 * Renders price with a sleek, smaller, non-bulky Philippine Peso sign (₱)
 */
export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  className = '',
  pesoClassName = '',
  digitsClassName = '',
}) => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0')) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={`inline-flex items-baseline font-sans ${className}`}>
      <span
        className={`text-[0.72em] font-normal mr-0.5 opacity-85 select-none align-baseline leading-none ${pesoClassName}`}
      >
        ₱
      </span>
      <span className={digitsClassName}>{formatted}</span>
    </span>
  );
};

export const PesoSign: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`text-[0.72em] font-normal select-none opacity-85 mr-0.5 align-baseline leading-none ${className}`}
  >
    ₱
  </span>
);
