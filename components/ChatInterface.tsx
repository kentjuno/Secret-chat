import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Trash2, XCircle, Lock, Unlock, Check, Loader2, AlertCircle, Smile, Save, Image as ImageIcon, ChevronLeft, Flame, UserRound, UserPlus, Clock, AlertTriangle, EyeOff, Ban } from 'lucide-react';
import { Message, ConnectionStatus, EncryptionMode, Contact } from '../types';
import { Button } from './Button';
import { encryptMessage } from '../utils/crypto';

interface ChatInterfaceProps {
  messages: Message[];
  contacts: Contact[];
  status: ConnectionStatus;
  myId: string;
  peerId: string;
  peerName: string; // Added prop
  isPeerTyping: boolean;
  encryptionMode: EncryptionMode;
  cryptoKey: CryptoKey | null; // Added prop for direct encryption
  theme: 'cyber' | 'stealth';
  burnTimer: number;
  onSendMessage: (id: string, text: string) => void;
  onSendImage?: (id: string, content: string, isEncrypted?: boolean) => void; // Updated signature
  onSendContact?: (id: string, contactData: string) => void;
  onDeleteMessage: (id: string) => void;
  onTyping: (isTyping: boolean) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onDisconnect: () => void;
  onBack: () => void;
  onClearChat: () => void;
  onSaveSession: (name: string) => void;
  onAddSharedContact?: (id: string, name: string) => void;
}

// Emoji set for quick reactions
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  contacts,
  status,
  myId,
  peerId,
  peerName,
  isPeerTyping,
  encryptionMode,
  cryptoKey,
  theme,
  burnTimer,
  onSendMessage,
  onSendImage,
  onSendContact,
  onDeleteMessage,
  onTyping,
  onReaction,
  onDisconnect,
  onBack,
  onClearChat,
  onSaveSession,
  onAddSharedContact
}) => {
  const [inputText, setInputText] = useState('');
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null); // Message ID where emoji picker is open
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  // SECURITY STATE
  const [isAppBlurred, setIsAppBlurred] = useState(false);
  const [lockdown, setLockdown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCyber = theme === 'cyber';

  // --- SECURITY FEATURES ---
  useEffect(() => {
    // 1. Blur on visibility change (Tab switch / Mobile minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsAppBlurred(true);
        document.title = "GHOSTLINK - SECURE";
      } else {
        // Require a small interaction or delay to unblur? 
        // For now, auto unblur for UX, but the brief flash protects against "Recent Apps" screenshot.
        setIsAppBlurred(false);
        document.title = "GhostLink - Secret Chat";
      }
    };

    // 2. Detect PrintScreen Key (Desktop)
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'PrintScreen') {
            setLockdown(true); // Permanent lockdown until back
            // Copy fake text to clipboard to overwrite any text they might have tried to select
            navigator.clipboard.writeText("🚫 SCREENSHOT ATTEMPT DETECTED. CHAT CLEARED.");
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);


  const scrollToBottom = () => {
    if (!lockdown) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPeerTyping, lockdown]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeReactionId && !(event.target as Element).closest('.reaction-picker-trigger')) {
        setActiveReactionId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeReactionId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Notify typing started
    onTyping(true);

    // Debounce notify typing stopped
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // Clear typing status immediately when sending
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTyping(false);
    
    const msgId = Math.random().toString(36).substr(2, 9);
    onSendMessage(msgId, inputText);
    
    // Schedule deletion if burn timer active
    if (burnTimer > 0) {
        setTimeout(() => {
            onDeleteMessage(msgId);
        }, burnTimer * 1000);
    }

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saveName.trim()) {
      onSaveSession(saveName.trim());
      setShowSaveModal(false);
      setSaveName('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSendImage) return;

    // Simple check
    if (!file.type.startsWith('image/')) {
        alert("Chỉ hỗ trợ gửi hình ảnh.");
        return;
    }

    setIsProcessingImage(true);
    
    // Compress and Resize
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            const newWidth = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
            const newHeight = (img.width > MAX_WIDTH) ? (img.height * scaleSize) : img.height;

            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Generate message ID
            const msgId = Math.random().toString(36).substr(2, 9);
            
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setIsProcessingImage(false);
                    return;
                }

                try {
                    if (encryptionMode === EncryptionMode.AES_256 && cryptoKey) {
                        // ENCRYPTION PATH: Convert to byte array and encrypt
                        const arrayBuffer = await blob.arrayBuffer();
                        const uint8Array = new Uint8Array(arrayBuffer);
                        const encryptedContent = await encryptMessage(uint8Array, cryptoKey);
                        
                        // Send encrypted content string (JSON with IV/Data)
                        onSendImage(msgId, encryptedContent, true);
                    } else {
                        // STANDARD PATH: Convert to Base64 Data URL
                        const reader = new FileReader();
                        reader.onloadend = () => {
                             onSendImage(msgId, reader.result as string, false);
                        };
                        reader.readAsDataURL(blob);
                    }
                    
                    if (burnTimer > 0) {
                        setTimeout(() => onDeleteMessage(msgId), burnTimer * 1000);
                    }
                } catch (error) {
                    console.error("Image processing error:", error);
                    alert("Error processing image.");
                } finally {
                    setIsProcessingImage(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }, 'image/jpeg', 0.7);
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleContactSelect = (contact: Contact) => {
      if (onSendContact) {
          const msgId = Math.random().toString(36).substr(2, 9);
          // Only send safe info
          const payload = JSON.stringify({
              id: contact.id,
              name: contact.name,
              encryptionMode: contact.encryptionMode
          });
          onSendContact(msgId, payload);
          if (burnTimer > 0) {
              setTimeout(() => onDeleteMessage(msgId), burnTimer * 1000);
          }
      }
      setShowContactPicker(false);
  };

  // Helper to group reactions
  const getGroupedReactions = (msg: Message) => {
    const groups: {[key: string]: {count: number, hasMyReaction: boolean}} = {};
    msg.reactions.forEach(r => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = { count: 0, hasMyReaction: false };
      }
      groups[r.emoji].count++;
      if (r.senderId === myId) groups[r.emoji].hasMyReaction = true;
    });
    return Object.entries(groups).map(([emoji, data]) => ({
      emoji,
      ...data
    }));
  };

  // Theme Constants
  const colors = {
    bg: isCyber ? 'bg-cyber-dark' : 'bg-neutral-900',
    headerBg: isCyber ? 'bg-cyber-black/95' : 'bg-neutral-950/95',
    headerBorder: isCyber ? 'border-cyber-gray' : 'border-neutral-800',
    textMain: isCyber ? 'text-white' : 'text-gray-200',
    textDim: isCyber ? 'text-gray-500' : 'text-gray-600',
    accent: isCyber ? 'text-cyber-neon' : 'text-white',
    bubbleMe: isCyber 
      ? 'bg-cyber-neon/10 border-cyber-neon/30 text-gray-100 shadow-[0_0_15px_rgba(0,255,65,0.05)]' 
      : 'bg-white text-black border border-transparent shadow-sm', 
    bubblePeer: isCyber
      ? 'bg-gray-900/90 border-gray-800 text-gray-300'
      : 'bg-neutral-800 border-neutral-700 text-gray-200',
    inputBg: isCyber ? 'bg-cyber-gray/50' : 'bg-neutral-800',
    inputBorder: isCyber ? 'border-gray-700' : 'border-neutral-700',
  };

  // --- RENDER LOCKDOWN MODE ---
  if (lockdown) {
    return (
      <div className={`flex flex-col h-full w-full items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200 ${isCyber ? 'bg-cyber-black' : 'bg-red-950'}`}>
          <div className="mb-6 relative">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 animate-pulse"></div>
              <Shield size={80} className="text-red-500 relative z-10" />
              <Ban size={40} className="text-white absolute bottom-0 -right-2 z-20 bg-black rounded-full p-1" />
          </div>
          
          <h1 className="text-3xl font-black font-hacker text-red-500 mb-2 tracking-widest">SECURITY BREACH</h1>
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-8 max-w-xs">
              <p className="text-red-200 font-mono text-sm">
                  SCREENSHOT ATTEMPT DETECTED.<br/>
                  INTERFACE CLEARED FOR SAFETY.
              </p>
          </div>
          
          <Button 
              variant="danger" 
              onClick={onBack}
              className="w-full max-w-xs h-12"
          >
              <ChevronLeft size={20} /> RETURN TO MENU
          </Button>
      </div>
    );
  }

  // --- RENDER NORMAL MODE ---
  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden ${colors.bg}`}>
      
      {/* SECURITY OVERLAYS */}
      {isAppBlurred && (
          <div className="absolute inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6">
              <EyeOff size={48} className="text-gray-500 mb-4" />
              <h2 className="text-xl font-bold text-gray-400 font-hacker">SECURE PAUSE</h2>
              <p className="text-xs text-gray-600 mt-2">App content hidden in background</p>
          </div>
      )}

      {/* Background Grid Effect (Cyber only) */}
      {isCyber && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.9)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20"></div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-xs p-6 rounded-2xl border shadow-2xl text-center ${isCyber ? 'bg-cyber-black border-cyber-alert' : 'bg-neutral-900 border-red-500'}`}>
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500 animate-pulse" />
            <h3 className={`font-hacker font-bold text-lg mb-2 ${colors.textMain}`}>DELETE HISTORY?</h3>
            <p className="text-xs text-gray-500 mb-6">
              This will permanently remove all messages in this conversation from this device.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
              <Button 
                variant="danger" 
                onClick={() => { 
                  onClearChat(); 
                  setShowClearConfirm(false); 
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Session Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form 
            onSubmit={handleSaveSubmit}
            className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl ${isCyber ? 'bg-cyber-black border-cyber-neon' : 'bg-neutral-900 border-neutral-700'}`}>
            <h3 className={`font-hacker font-bold text-lg mb-4 ${isCyber ? 'text-cyber-neon' : 'text-white'}`}>SAVE CONNECTION</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ALIAS / NAME</label>
                <input
                  autoFocus
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="e.g. Alice"
                  className={`w-full p-3 rounded-lg border outline-none ${isCyber ? 'bg-gray-900 border-gray-700 text-white focus:border-cyber-neon' : 'bg-neutral-800 border-neutral-600 text-white focus:border-white'}`}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                This will save the Peer ID and current encryption settings (Keys) to this device so you can resume later.
              </p>
              <div className="flex gap-2 justify-end mt-4">
                <Button type="button" variant="ghost" onClick={() => setShowSaveModal(false)}>Cancel</Button>
                <Button type="submit" variant={isCyber ? 'primary' : 'secondary'}>Save</Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Contact Picker Modal */}
      {showContactPicker && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className={`w-full max-w-sm flex flex-col max-h-[70vh] rounded-2xl border shadow-2xl ${isCyber ? 'bg-cyber-black border-cyber-neon' : 'bg-neutral-900 border-neutral-700'}`}>
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                      <h3 className={`font-bold ${colors.textMain}`}>Select Contact to Share</h3>
                      <button onClick={() => setShowContactPicker(false)} className={colors.textDim}><XCircle size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {contacts.length === 0 ? (
                          <div className="p-8 text-center text-sm opacity-50">No contacts saved.</div>
                      ) : (
                          contacts.map(c => (
                              <button 
                                key={c.id} 
                                onClick={() => handleContactSelect(c)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${isCyber ? 'border-gray-800 hover:border-cyber-neon hover:bg-gray-900' : 'border-gray-700 hover:bg-gray-800'}`}
                              >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isCyber ? 'bg-cyber-neon/20 text-cyber-neon' : 'bg-white/20 text-white'}`}>
                                      {c.name.substring(0,1).toUpperCase()}
                                  </div>
                                  <div className="text-left">
                                      <div className={`font-bold text-sm ${colors.textMain}`}>{c.name}</div>
                                      <div className="text-[10px] opacity-50 font-mono truncate w-32">{c.id}</div>
                                  </div>
                              </button>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Header - Fixed Height */}
      <header className={`flex-none px-4 py-3 border-b backdrop-blur flex justify-between items-center z-10 ${colors.headerBorder} ${colors.headerBg}`}>
        {/* Left Side: Back + Info */}
        <div className="flex items-center gap-3 overflow-hidden flex-1">
            <button 
                onClick={onBack}
                className={`p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors shrink-0 ${isCyber ? 'text-cyber-neon' : 'text-gray-300'}`}
            >
                <ChevronLeft size={24} />
            </button>
            
            <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 shrink-0 rounded-full ${status === ConnectionStatus.CONNECTED ? (isCyber ? 'bg-cyber-neon animate-pulse' : 'bg-white') : 'bg-red-500'}`} />
                    <span className={`font-hacker text-sm font-bold tracking-wider truncate ${colors.accent}`}>
                    {peerName}
                    </span>
                    {encryptionMode === EncryptionMode.AES_256 && (
                       <Shield size={14} className={isCyber ? "text-cyber-neon fill-cyber-neon/20" : "text-green-500 fill-green-500/20"} />
                    )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-mono truncate ${colors.textDim}`}>
                      {peerName !== peerId ? `ID: ${peerId}` : (status === ConnectionStatus.CONNECTED ? 'CONNECTED' : 'DISCONNECTED')}
                    </span>
                    <span className="text-gray-700">|</span>
                    {encryptionMode === EncryptionMode.AES_256 ? (
                        <span className={`text-[9px] font-bold flex items-center gap-1 border px-1.5 py-0.5 rounded ${isCyber ? 'border-cyber-neon/30 text-cyber-neon bg-cyber-neon/5' : 'border-green-500/30 text-green-500 bg-green-500/5'}`}>
                        <Lock size={8} /> E2EE AES-256
                        </span>
                    ) : (
                        <span className={`text-[9px] flex items-center gap-1 ${colors.textDim}`}>
                        <Unlock size={8} /> STANDARD
                        </span>
                    )}
                    {burnTimer > 0 && (
                        <>
                            <span className="text-gray-700">|</span>
                            <span className={`text-[9px] font-bold flex items-center gap-0.5 ${isCyber ? 'text-orange-500' : 'text-orange-600'}`}>
                                <Flame size={10} /> {burnTimer}s
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Right Side: Buttons */}
        <div className="flex gap-1 shrink-0 ml-2">
          <Button 
            variant="ghost" 
            onClick={() => setShowSaveModal(true)} 
            className={`!px-2.5 !py-1.5 h-8 border ${isCyber ? 'border-cyber-neon/30 text-cyber-neon' : 'border-gray-600 text-gray-300'}`}
            title="Save Session"
          >
            <Save size={16} />
          </Button>
           <Button variant="danger" onClick={onDisconnect} className="!px-3 !py-1.5 text-xs h-8">
            <XCircle size={16} />
          </Button>
        </div>
      </header>

      {/* Chat Area - Flexible Height */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 scrollbar-thin scrollbar-thumb-cyber-neon/20 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 font-hacker opacity-50 text-center animate-in fade-in zoom-in-95 duration-500">
            <Shield size={48} className={`mb-4 ${isCyber ? 'text-cyber-dim' : 'text-gray-700'}`} />
            <p className="text-sm">ENCRYPTION ESTABLISHED</p>
            <p className="text-xs mt-1 text-gray-500">MODE: {encryptionMode === EncryptionMode.AES_256 ? 'AES-GCM (Enhanced)' : 'WebRTC (Standard)'}</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} group/message animate-in slide-in-from-bottom-2 fade-in duration-300 ease-out`}
          >
            <div className={`
              max-w-[85%] md:max-w-[70%] break-words p-3 rounded-2xl border backdrop-blur-sm relative text-sm md:text-base 
              flex flex-col gap-1 select-none pointer-events-auto touch-manipulation
              ${msg.isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} 
              ${msg.isMe ? colors.bubbleMe : colors.bubblePeer}
            `}>
              
              {/* Message Content Render */}
              <div className="leading-relaxed relative z-10">
              {(() => {
                  if (msg.type === 'image') {
                      return (
                          <div className="rounded overflow-hidden">
                              <img src={msg.content} alt="Encrypted Content" className="max-w-full h-auto rounded pointer-events-none" />
                          </div>
                      );
                  } else if (msg.type === 'contact') {
                      let contactData: any = {};
                      try { contactData = JSON.parse(msg.content); } catch (e) { contactData = { name: 'Unknown', id: 'Error' }; }
                      
                      const isSaved = contacts.some(c => c.id === contactData.id) || contactData.id === myId;
                      
                      return (
                          <div className={`p-3 rounded-xl border flex flex-col gap-2 ${isCyber ? 'bg-black/40 border-gray-700' : 'bg-black/10 border-gray-600'}`}>
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isCyber ? 'bg-gray-800 text-cyber-neon' : 'bg-gray-700 text-white'}`}>
                                      {contactData.name?.substring(0,1).toUpperCase() || '?'}
                                  </div>
                                  <div className="min-w-0">
                                      <p className="font-bold text-sm truncate">{contactData.name}</p>
                                      <p className="text-[10px] font-mono opacity-60 truncate w-32">{contactData.id}</p>
                                  </div>
                              </div>
                              {!msg.isMe && !isSaved && (
                                  <button 
                                    onClick={() => onAddSharedContact?.(contactData.id, contactData.name)}
                                    className={`w-full py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition-colors ${isCyber ? 'bg-cyber-neon text-black hover:bg-white' : 'bg-white text-black hover:bg-gray-200'}`}
                                  >
                                      <UserPlus size={14} /> Add Contact
                                  </button>
                              )}
                              {isSaved && !msg.isMe && (
                                  <div className="text-[10px] text-center opacity-50 font-bold uppercase py-1">Saved</div>
                              )}
                          </div>
                      );
                  } else {
                      return <p className="whitespace-pre-wrap">{msg.content}</p>;
                  }
              })()}
              </div>

              {/* Footer: Timestamp & Status */}
              <div className="flex items-center justify-end gap-1.5 mt-0.5 select-none opacity-60">
                {msg.isEncrypted && <Lock size={8} className={isCyber ? "text-cyber-neon" : "text-current"} />}
                
                {/* FIX: Ensure burnTimer is strictly positive before rendering to avoid printing '0' */}
                {msg.burnTimer && msg.burnTimer > 0 ? (
                    <span className="flex items-center gap-0.5 text-orange-500 text-[9px] font-bold">
                        <Flame size={8}/> {msg.burnTimer}s
                    </span>
                ) : null}
                
                <span className="text-[10px] font-mono leading-none">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>

                {msg.isMe && (
                    <div className="flex items-center">
                      {msg.status === 'sending' && <Loader2 size={10} className="animate-spin" />}
                      {msg.status === 'sent' && <Check size={12} className={isCyber ? "text-cyber-neon" : "text-green-500"} />}
                      {msg.status === 'error' && <AlertCircle size={12} className="text-red-500" />}
                    </div>
                )}
              </div>

              {/* Reaction Trigger Button */}
              <div className={`absolute -bottom-2 ${msg.isMe ? '-left-8' : '-right-8'} opacity-0 group-hover/message:opacity-100 transition-opacity reaction-picker-trigger`}>
                <button 
                  onClick={() => setActiveReactionId(activeReactionId === msg.id ? null : msg.id)}
                  className="p-1.5 rounded-full bg-gray-900 border border-gray-700 text-gray-400 hover:text-cyber-neon hover:border-cyber-neon transition-colors"
                >
                  <Smile size={14} />
                </button>
                
                {activeReactionId === msg.id && (
                  <div className={`absolute bottom-8 ${msg.isMe ? 'left-0' : 'right-0'} bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 flex gap-1 z-50 animate-in zoom-in-95 duration-200`}>
                    {QUICK_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReaction(msg.id, emoji);
                          setActiveReactionId(null);
                        }}
                        className="hover:bg-gray-800 p-1.5 rounded text-lg transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Reactions */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 justify-end">
                  {getGroupedReactions(msg).map((g) => (
                    <button
                      key={g.emoji}
                      onClick={() => onReaction(msg.id, g.emoji)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors
                        ${g.hasMyReaction 
                          ? (isCyber ? 'bg-cyber-neon/20 border-cyber-neon text-cyber-neon' : 'bg-white/20 border-white text-white')
                          : 'bg-black/40 border-gray-700 text-gray-400 hover:bg-gray-800'
                        }`}
                    >
                      <span>{g.emoji}</span>
                      <span className="font-bold">{g.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isPeerTyping && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`border rounded-2xl rounded-tl-sm px-4 py-3 text-xs font-mono flex items-center gap-1 backdrop-blur-sm shadow-sm ${isCyber ? 'bg-gray-800/50 border-gray-700/50 text-cyber-neon/70' : 'bg-neutral-800 border-neutral-700 text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s] ${isCyber ? 'bg-cyber-neon' : 'bg-white'}`}></span>
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s] ${isCyber ? 'bg-cyber-neon' : 'bg-white'}`}></span>
              <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${isCyber ? 'bg-cyber-neon' : 'bg-white'}`}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed Bottom */}
      <div className={`flex-none p-3 pb-safe-bottom border-t z-20 ${isCyber ? 'bg-cyber-black border-cyber-gray' : 'bg-neutral-900 border-neutral-800'}`}>
        {/* Toolbar */}
        <div className="flex gap-3 mb-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar justify-end">
           {burnTimer > 0 && (
               <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-500 animate-pulse px-2 py-1.5">
                   <Flame size={12} /> Auto-Burn: {burnTimer}s
               </div>
           )}
           <button 
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyber-alert hover:bg-cyber-alert/10 px-2 py-1.5 rounded transition-colors whitespace-nowrap"
          >
            <Trash2 size={12} /> Clear Chat
          </button>
        </div>

        <div className="flex gap-2 relative items-end">
          {/* File Input Hidden */}
          <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
          />
          
          <Button 
            onClick={() => setShowContactPicker(true)} 
            className={`h-12 w-12 !px-0 rounded-xl shrink-0 ${!isCyber && 'bg-white text-black hover:bg-gray-200'}`}
            title="Share Contact"
          >
            <UserRound size={20} />
          </Button>

          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessingImage}
            className={`h-12 w-12 !px-0 rounded-xl shrink-0 ${!isCyber && 'bg-white text-black hover:bg-gray-200'}`}
            title="Send Image"
          >
              {isProcessingImage ? <Loader2 size={20} className="animate-spin"/> : <ImageIcon size={20} />}
          </Button>

          <textarea
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type message..."
            className={`flex-1 border text-white rounded-xl p-3 focus:outline-none resize-none h-12 min-h-[48px] max-h-32 font-sans text-base leading-5 ${isCyber ? 'bg-cyber-gray/50 border-gray-700 focus:border-cyber-neon' : 'bg-neutral-800 border-neutral-700 focus:border-white'}`}
            style={{ fontSize: '16px' }} /* Prevent iOS zoom */
          />
          <Button onClick={handleSend} disabled={!inputText.trim()} className={`h-12 w-12 !px-0 rounded-xl shrink-0 ${!isCyber && 'bg-white text-black hover:bg-gray-200'}`}>
            <Send size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};