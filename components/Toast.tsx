import React from 'react';
import { Check, AlertTriangle, Bell } from 'lucide-react';

export interface ToastMsg {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const ToastContainer: React.FC<{ toasts: ToastMsg[] }> = ({ toasts }) => {
  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className={`px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-top-2 fade-in duration-300 flex items-center gap-2 max-w-sm w-full pointer-events-auto
            ${t.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' : ''}
            ${t.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' : ''}
            ${t.type === 'info' ? 'bg-blue-500/10 border-blue-500 text-blue-500' : ''}
          `}
        >
            {t.type === 'success' && <Check size={18} />}
            {t.type === 'error' && <AlertTriangle size={18} />}
            {t.type === 'info' && <Bell size={18} />}
            <span className="text-sm font-bold">{t.message}</span>
        </div>
      ))}
    </div>
  );
};