import React from 'react';

interface PriceDisplayProps {
  amount: number | string;
  className?: string;
  symbol?: string;
  pesoClassName?: string;
  digitsClassName?: string;
}

/**
 * Renders price with sleek formatting and smaller, non-bulky currency sign ($ or ₱)
 */
export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  className = '',
  symbol = '₱',
  pesoClassName = '',
  digitsClassName = '',
}) => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || '0')) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isPeso = symbol === '₱';

  return (
    <span className={`inline-flex items-baseline font-sans ${className}`}>
      <span
        className={`select-none mr-0.5 leading-none ${
          isPeso
            ? `text-[0.76em] font-medium opacity-90 align-baseline ${pesoClassName}`
            : `text-[0.88em] font-semibold text-[#56534a] align-baseline ${pesoClassName}`
        }`}
      >
        {symbol}
      </span>
      <span className={digitsClassName}>{formatted}</span>
    </span>
  );
};

export const CurrencySign: React.FC<{ symbol?: string; className?: string }> = ({
  symbol = '₱',
  className = '',
}) => {
  const isPeso = symbol === '₱';
  return (
    <span
      className={`select-none mr-0.5 leading-none ${
        isPeso
          ? `text-[0.72em] font-normal opacity-85 align-baseline ${className}`
          : `text-[0.88em] font-semibold text-[#56534a] align-baseline ${className}`
      }`}
    >
      {symbol}
    </span>
  );
};

export const PesoSign: React.FC<{ className?: string }> = ({ className = '' }) => (
  <CurrencySign symbol="₱" className={className} />
);
