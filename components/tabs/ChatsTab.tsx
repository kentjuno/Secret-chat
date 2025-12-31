import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Plus, RefreshCw, ArrowDown } from 'lucide-react';
import { SavedPeer, Contact } from '../../types';
import { Button } from '../Button';

interface ChatsTabProps {
  recentPeers: SavedPeer[];
  contacts: Contact[];
  unreadCounts: Record<string, number>;
  checkIsOnline: (id: string) => boolean;
  onStartChat: (id: string) => void;
  onShowAddModal: () => void;
  onGotoContacts: () => void;
  onRefresh?: () => Promise<void>;
  isCyber: boolean;
  colors: any;
}

export const ChatsTab: React.FC<ChatsTabProps> = ({
  recentPeers,
  contacts,
  unreadCounts,
  checkIsOnline,
  onStartChat,
  onShowAddModal,
  onGotoContacts,
  onRefresh,
  isCyber,
  colors
}) => {
  // Pull to Refresh State
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants
  const MAX_PULL = 150;
  const THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only enable pull if parent is scrolled to top
    const scrollTop = containerRef.current?.parentElement?.scrollTop || 0;
    if (scrollTop <= 0 && !isRefreshing) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const scrollTop = containerRef.current?.parentElement?.scrollTop || 0;
    if (startY > 0 && scrollTop <= 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        // Logarithmic resistance
        const resistance = diff * 0.4; 
        setPullDistance(Math.min(resistance, MAX_PULL));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(60); // Snap to loading position
      
      // Haptic feedback
      try { if(navigator.vibrate) navigator.vibrate(20); } catch(e) {}

      await onRefresh();
      
      // Wait a bit before closing
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      setPullDistance(0);
    }
    setStartY(0);
  };

  return (
    <div 
        ref={containerRef}
        className="relative min-h-full touch-pan-y flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
        {/* Pull Indicator */}
        <div 
            className="absolute left-0 right-0 -top-10 flex justify-center items-center pointer-events-none transition-all duration-200 z-10"
            style={{ 
                transform: `translateY(${Math.min(pullDistance, 100)}px)`,
                opacity: pullDistance > 10 ? 1 : 0
            }}
        >
            <div className={`rounded-full p-2 shadow-lg flex items-center justify-center ${isCyber ? 'bg-cyber-black border border-cyber-neon text-cyber-neon' : 'bg-white text-black'}`}>
                {isRefreshing ? (
                    <RefreshCw size={20} className="animate-spin" />
                ) : (
                    <ArrowDown size={20} style={{ transform: `rotate(${pullDistance > THRESHOLD ? 180 : 0}deg)`, transition: 'transform 0.2s' }} />
                )}
            </div>
        </div>

        {/* Content Container with Transform */}
        <div 
            className="flex-1 space-y-4 animate-in fade-in duration-300 transition-transform duration-200 ease-out pb-20"
            style={{ transform: `translateY(${pullDistance}px)` }}
        >
            {recentPeers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center opacity-50">
                    <MessageSquare size={48} className="mb-2" />
                    <p className="text-sm">Chưa có tin nhắn nào.</p>
                    <Button className="mt-4" onClick={onGotoContacts}>Bắt đầu cuộc trò chuyện</Button>
                </div>
            ) : (
                <>
                <div className="flex justify-between items-end mb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider opacity-70">Gần đây</h2>
                </div>
                <div className="space-y-2">
                    {recentPeers.map(peer => {
                        const contact = contacts.find(c => c.id === peer.id);
                        const unread = unreadCounts[peer.id] || 0;
                        const isOnline = checkIsOnline(peer.id);

                        return (
                            <div 
                                key={peer.id}
                                onClick={() => onStartChat(peer.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.itemBg} active:scale-[0.98] transition-all cursor-pointer hover:border-gray-600 relative`}
                            >
                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isCyber ? 'bg-gray-800 text-cyber-neon' : 'bg-neutral-700 text-white'}`}>
                                        {(contact?.name || peer.name || peer.id.substring(0,2)).substring(0,1).toUpperCase()}
                                    </div>
                                    {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>}
                                </div>
                                
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <h3 className={`font-bold text-sm truncate ${contact ? colors.accent : colors.text}`}>
                                            {contact?.name || peer.name || peer.id}
                                        </h3>
                                        <span className="text-[10px] opacity-50 font-mono">
                                            {new Date(peer.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-0.5">
                                        <p className={`text-xs truncate ${unread > 0 ? 'text-white font-bold' : colors.dim} max-w-[80%]`}>
                                            {peer.snippet}
                                        </p>
                                        {unread > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                </>
            )}
        </div>
        
        {/* Floating Action Button - Fixed to viewport bottom when scrolling */}
        <div className="sticky bottom-4 w-full flex justify-end pointer-events-none z-20">
            <button 
                onClick={onShowAddModal}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90 pointer-events-auto ${isCyber ? 'bg-cyber-neon text-black' : 'bg-white text-black'}`}
            >
                <Plus size={24} />
            </button>
        </div>
    </div>
  );
};