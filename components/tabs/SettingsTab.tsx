import React from 'react';
import { User, Zap, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { UserSettings } from '../../types';

interface SettingsTabProps {
  userSettings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  onClearHistory: () => void;
  isCyber: boolean;
  colors: any;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  userSettings,
  updateSettings,
  onClearHistory,
  isCyber,
  colors
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
         <div className={`p-4 rounded-xl border ${colors.border} ${colors.itemBg}`}>
             <h3 className="font-bold mb-4 flex items-center gap-2"><User size={16}/> Hồ sơ</h3>
             <div className="space-y-3">
                 <label className="text-xs uppercase font-bold opacity-70">Tên hiển thị (Local)</label>
                 <input 
                    value={userSettings.username}
                    onChange={(e) => updateSettings({username: e.target.value})}
                    className={`w-full p-2 rounded border outline-none ${isCyber ? 'bg-black border-gray-700' : 'bg-neutral-900 border-neutral-700'}`}
                    placeholder="Tên của bạn..."
                 />
             </div>
         </div>

         <div className={`p-4 rounded-xl border ${colors.border} ${colors.itemBg}`}>
             <h3 className="font-bold mb-4 flex items-center gap-2"><Zap size={16}/> Giao diện</h3>
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => updateSettings({theme: 'cyber'})} className={`p-3 rounded border text-sm font-bold ${userSettings.theme === 'cyber' ? 'border-cyber-neon text-cyber-neon bg-cyber-neon/10' : 'border-gray-700 opacity-50'}`}>CYBER</button>
                <button onClick={() => updateSettings({theme: 'stealth'})} className={`p-3 rounded border text-sm font-bold ${userSettings.theme === 'stealth' ? 'border-white text-white bg-white/10' : 'border-gray-700 opacity-50'}`}>STEALTH</button>
             </div>
         </div>

          {/* Burn Timer Setting */}
          <div className={`p-4 rounded-xl border ${colors.border} ${colors.itemBg}`}>
             <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={16}/> Tin nhắn tự hủy</h3>
             <div className="grid grid-cols-4 gap-2">
                 {[0, 10, 30, 60].map(time => (
                     <button 
                        key={time}
                        onClick={() => updateSettings({burnTimer: time})}
                        className={`p-2 rounded border text-xs font-bold ${userSettings.burnTimer === time 
                            ? (isCyber ? 'border-cyber-neon text-cyber-neon bg-cyber-neon/10' : 'border-white text-white bg-white/10') 
                            : 'border-gray-700 opacity-50'}`}
                     >
                         {time === 0 ? 'OFF' : `${time}s`}
                     </button>
                 ))}
             </div>
         </div>

         <div className={`p-4 rounded-xl border border-red-900/50 bg-red-900/10`}>
             <h3 className="font-bold mb-4 flex items-center gap-2 text-red-500"><AlertTriangle size={16}/> Vùng Nguy Hiểm</h3>
             <p className="text-xs opacity-70 mb-4">Xóa toàn bộ lịch sử trò chuyện. Hành động này không thể hoàn tác.</p>
             <button 
                onClick={onClearHistory}
                className="w-full p-3 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/20 flex items-center justify-center gap-2 font-bold uppercase text-xs transition-all"
             >
                <Trash2 size={16} /> Xóa tất cả lịch sử chat
             </button>
         </div>
    </div>
  );
};