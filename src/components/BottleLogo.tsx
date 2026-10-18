import React from 'react';

interface BottleLogoProps {
  size?: number;
  showSubtitle?: boolean;
  className?: string;
}

export const BottleLogo: React.FC<BottleLogoProps> = ({
  size = 36,
  showSubtitle = true,
  className = '',
}) => {
  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className="flex items-center gap-3">
        {/* Original outline perfume bottle icon */}
        <div className="shrink-0 flex items-center justify-center text-[#8c7a5b]">
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#8c7a5b]"
          >
            {/* Atomizer / sprayer cap */}
            <path
              d="M10 2.5h4M12 2.5v3M9.5 5.5h5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Bottle body outline */}
            <path
              d="M9.5 5.5c-.3 0-.6.15-.8.4L6.5 9c-.5.65-.8 1.45-.8 2.3v7.2c0 1.4 1.1 2.5 2.5 2.5h7.6c1.4 0 2.5-1.1 2.5-2.5v-7.2c0-.85-.3-1.65-.8-2.3l-2.2-3.1c-.2-.25-.5-.4-.8-.4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Fill level line */}
            <path
              d="M7.5 14.5h9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Perfume Inventory stacked title */}
        <div className="flex flex-col">
          <span className="font-serif text-[19px] sm:text-[20px] font-bold leading-tight text-[#1b1915] tracking-tight">
            Perfume
          </span>
          <span className="font-serif text-[19px] sm:text-[20px] font-bold leading-tight text-[#1b1915] tracking-tight -mt-0.5">
            Inventory
          </span>
        </div>
      </div>

      {showSubtitle && (
        <div className="text-[10px] tracking-[0.22em] uppercase text-[#8c7a5b] font-bold mt-2 font-sans pl-0.5">
          SCANNER &amp; STOCK LOG
        </div>
      )}
    </div>
  );
};

