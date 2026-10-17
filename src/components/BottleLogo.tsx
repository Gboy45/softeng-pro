import React from 'react';

interface BottleLogoProps {
  size?: number;
  showSubtitle?: boolean;
  className?: string;
}

export const BottleLogo: React.FC<BottleLogoProps> = ({
  size = 28,
  showSubtitle = true,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Original Perfume Bottle Icon from ui.js / image.png */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-[#9c8f6f]"
      >
        <path
          d="M9 3h6M10 3v3.2c0 .5-.15.9-.45 1.25L8 9.4c-.55.65-.85 1.5-.85 2.4v6.7c0 1.4 1.1 2.5 2.5 2.5h4.7c1.4 0 2.5-1.1 2.5-2.5V11.8c0-.9-.3-1.75-.85-2.4l-1.55-1.95A2 2 0 0114 6.2V3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.3 13.5h7.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>

      <div className="flex flex-col">
        <span className="font-serif text-[17px] font-bold leading-tight text-[#242119]">
          Perfume<br />Inventory
        </span>
        {showSubtitle && (
          <span className="text-[10px] tracking-[0.14em] uppercase text-[#7c7156] font-semibold mt-1">
            Scanner &amp; Stock Log
          </span>
        )}
      </div>
    </div>
  );
};
