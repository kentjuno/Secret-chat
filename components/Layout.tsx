import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  theme: 'cyber' | 'stealth';
}

export const MobileWrapper: React.FC<LayoutProps> = ({ children, theme }) => {
  const themeStyles = theme === 'cyber' 
    ? "bg-cyber-black md:border-gray-800" 
    : "bg-neutral-900 md:border-neutral-800";

  return (
    <div className="flex justify-center items-center h-[100dvh] w-full bg-black overflow-hidden">
      <div className={`
        w-full h-full 
        md:max-w-md md:h-[95vh] md:rounded-3xl md:border md:shadow-2xl 
        overflow-hidden relative flex flex-col transition-colors duration-500 
        ${themeStyles}
      `}>
          {/* 
            On mobile, we rely on the system status bar and home indicator areas.
            We use padding here for TOP only. 
            Bottom padding is handled by individual components (ChatInterface/BottomNav)
            to ensure their backgrounds extend into the safe area.
          */}
        <div 
            className="flex flex-col h-full w-full"
            style={{
                paddingTop: 'env(safe-area-inset-top, 0px)',
                // paddingBottom removed to allow full-bleed bottom components
            }}
        >
            {children}
        </div>
      </div>
    </div>
  );
};