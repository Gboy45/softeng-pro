import React from 'react';

interface BottleLogoProps {
  size?: number;
  showSubtitle?: boolean;
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export const BottleLogo: React.FC<BottleLogoProps> = ({
  size = 36,
  showSubtitle = true,
  className = '',
  layout = 'horizontal',
}) => {
  // SVG bottle icon precisely traced from user photo
  const bottleIcon = (
    <svg
      width={size}
      height={Math.round(size * 1.33)}
      viewBox="0 0 36 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#8c7a5b] shrink-0"
    >
      {/* Top Cap */}
      <rect
        x="13"
        y="3"
        width="10"
        height="5"
        rx="1"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Neck */}
      <path
        d="M15 8v4M21 8v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Flared shoulders, body, and rounded base */}
      <path
        d="M15 12c-3.5 1.5-6 4.5-6.5 8.5L8 37c0 3.3 2.7 6 6 6h8c3.3 0 6-2.7 6-6l-.5-16.5c-.5-4-3-7-6.5-8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Horizontal liquid fill line */}
      <path
        d="M8.2 28h19.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        {bottleIcon}
        <div className="mt-3 flex flex-col items-center">
          <span className="font-serif text-2xl font-bold leading-tight text-[#1b1915] tracking-tight">
            Perfume
          </span>
          <span className="font-serif text-2xl font-bold leading-tight text-[#1b1915] tracking-tight">
            Inventory
          </span>
          {showSubtitle && (
            <>
              <span className="text-[10px] tracking-[0.24em] uppercase text-[#8c7a5b] font-bold mt-2 font-sans">
                SCANNER &amp; STOCK LOG
              </span>
              <div className="w-12 h-0.5 bg-[#8c7a5b] rounded-full mt-3 opacity-80" />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className="flex items-center gap-3">
        {bottleIcon}

        {/* Perfume Inventory stacked title */}
        <div className="flex flex-col">
          <span className="font-serif text-[18px] sm:text-[20px] font-bold leading-tight text-[#1b1915] tracking-tight">
            Perfume
          </span>
          <span className="font-serif text-[18px] sm:text-[20px] font-bold leading-tight text-[#1b1915] tracking-tight -mt-0.5">
            Inventory
          </span>
        </div>
      </div>

      {showSubtitle && (
        <div className="text-[9.5px] sm:text-[10px] tracking-[0.22em] uppercase text-[#8c7a5b] font-bold mt-2 font-sans pl-0.5">
          SCANNER &amp; STOCK LOG
        </div>
      )}
    </div>
  );
};

