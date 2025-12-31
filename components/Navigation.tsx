import React from 'react';
import { MessageSquare, Users, Settings, Terminal, Wifi, WifiOff, Copy, Share2 } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'chats' | 'contacts' | 'settings';
  setActiveTab: (tab: 'chats' | 'contacts' | 'settings') => void;
  unreadCount: number;
  pendingRequestsCount: number;
  isCyber: boolean;
  colors: any;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  setActiveTab, 
  unreadCount, 
  pendingRequestsCount, 
  isCyber, 
  colors 
}) => (
  <div className={`flex justify-around items-center p-4 pb-safe-bottom border-t ${colors.border} ${isCyber ? 'bg-black/90' : 'bg-neutral-900/90'} backdrop-blur-md`}>
      <button onClick={() => setActiveTab('chats')} className={`relative flex flex-col items-center gap-1 ${activeTab === 'chats' ? colors.accent : colors.dim}`}>
          <MessageSquare size={20} />
          <span className="text-[10px] font-bold uppercase">Tin nhắn</span>
          {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
          )}
      </button>
      <button onClick={() => setActiveTab('contacts')} className={`relative flex flex-col items-center gap-1 ${activeTab === 'contacts' ? colors.accent : colors.dim}`}>
          <Users size={20} />
          <span className="text-[10px] font-bold uppercase">Danh bạ</span>
          {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-neon opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-neon"></span>
              </span>
          )}
      </button>
      <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? colors.accent : colors.dim}`}>
          <Settings size={20} />
          <span className="text-[10px] font-bold uppercase">Cài đặt</span>
      </button>
  </div>
);

interface TopBarProps {
  myId: string;
  serverStatus: 'connected' | 'disconnected';
  isCyber: boolean;
  colors: any;
  onGenerateInvite: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ myId, serverStatus, isCyber, colors, onGenerateInvite }) => (
  <div className={`p-4 border-b ${colors.border} flex justify-between items-center bg-opacity-50 backdrop-blur-sm`}>
      <div className="flex items-center gap-2">
          <Terminal size={20} className={colors.accent} />
          <h1 className="font-hacker font-bold text-lg tracking-tight">GHOSTLINK</h1>
      </div>
      <div className="flex items-center gap-2">
          {/* Server Status Indicator */}
          <div title={serverStatus === 'connected' ? 'Server Connected' : 'Disconnected'} className={`transition-colors ${serverStatus === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
              {serverStatus === 'connected' ? <Wifi size={14}/> : <WifiOff size={14}/>}
          </div>

          <div className={`w-2 h-2 rounded-full ${myId && serverStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_#00ff41]' : 'bg-red-500'}`}></div>
          <button onClick={() => navigator.clipboard.writeText(myId)} className="text-[10px] font-mono opacity-50 hover:opacity-100 flex items-center gap-1 border px-2 py-1 rounded border-gray-700">
              {myId || 'Loading...'} <Copy size={8} />
          </button>
           <button onClick={onGenerateInvite} className={`p-1.5 rounded border ${isCyber ? 'border-cyber-neon/30 text-cyber-neon hover:bg-cyber-neon/10' : 'border-gray-700 text-white hover:bg-white/10'}`}>
              <Share2 size={12} />
          </button>
      </div>
  </div>
);