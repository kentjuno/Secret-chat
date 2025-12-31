import React, { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore
import { Peer } from "https://esm.sh/peerjs@1.5.4?bundle-deps";
import { ChevronLeft, Clock } from 'lucide-react';

import { AppMode, ConnectionStatus, EncryptionMode, Message, SavedPeer, UserSettings, Contact } from './types';
import { ChatInterface } from './components/ChatInterface';
import { Button } from './components/Button';
import { deriveKey, encryptMessage, decryptMessage } from './utils/crypto';

// New Components
import { ToastContainer, ToastMsg } from './components/Toast';
import { MobileWrapper } from './components/Layout';
import { BottomNav, TopBar } from './components/Navigation';
import { ChatsTab } from './components/tabs/ChatsTab';
import { ContactsTab } from './components/tabs/ContactsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { AddContactModal } from './components/modals/AddContactModal';

// Global type for PeerJS
declare global {
  interface Window {
    Peer: any;
  }
}

const App: React.FC = () => {
  // Navigation State
  const [mode, setMode] = useState<AppMode>(AppMode.MAIN);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'settings'>('chats');
  
  // Logic State
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [peerServerStatus, setPeerServerStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [myId, setMyId] = useState<string>('');
  const [targetPeerId, setTargetPeerId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);
  const [recentPeers, setRecentPeers] = useState<SavedPeer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  // Friend Request State
  const [pendingRequests, setPendingRequests] = useState<{id: string, name: string}[]>([]);
  const [waitingForApproval, setWaitingForApproval] = useState<boolean>(false); // For Initiator
  
  // UI State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactId, setNewContactId] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  
  // Edit Contact State
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Settings State
  const [userSettings, setUserSettings] = useState<UserSettings>({
    username: '',
    theme: 'cyber',
    burnTimer: 0
  });
  
  // Encryption State
  const [encryptionMode, setEncryptionMode] = useState<EncryptionMode>(EncryptionMode.STANDARD);
  const [sharedSecret, setSharedSecret] = useState<string>('');
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<Map<string, any>>(new Map());
  
  // REFS for Stale Closure Prevention
  const contactsRef = useRef<Contact[]>([]);
  const modeRef = useRef<AppMode>(AppMode.MAIN);
  const targetPeerIdRef = useRef<string>('');

  // --- HELPERS ---

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Math.random().toString(36).substring(2);
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
  }, []);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  // --- INITIALIZATION ---

  useEffect(() => {
    try {
      const savedPeers = localStorage.getItem('ghostlink_recent_peers');
      if (savedPeers) setRecentPeers(JSON.parse(savedPeers));

      const savedContacts = localStorage.getItem('ghostlink_contacts');
      if (savedContacts) {
          const parsed = JSON.parse(savedContacts);
          setContacts(parsed);
          contactsRef.current = parsed;
      }

      const savedSettings = localStorage.getItem('ghostlink_settings');
      if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setUserSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.error("Failed to load local data", e);
    }
  }, []);

  // Sync State to Refs (Crucial for Event Listeners)
  useEffect(() => {
      contactsRef.current = contacts;
      modeRef.current = mode;
      targetPeerIdRef.current = targetPeerId;
  }, [contacts, mode, targetPeerId]);

  // Load History Effect
  useEffect(() => {
    if (mode === AppMode.CHAT && targetPeerId) {
        const historyKey = `ghostlink_chat_${targetPeerId}`;
        try {
            const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            setMessages(history);
        } catch (e) {
            console.error("Failed to load history", e);
            setMessages([]);
        }
    }
  }, [mode, targetPeerId]);

  // Handle Invite Links from URL
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const inviteId = params.get('invite');
      
      if (inviteId) {
          setNewContactId(inviteId);
          setShowAddContactModal(true);
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({path: cleanUrl}, "", cleanUrl);
      }
  }, []);

  useEffect(() => {
    let savedId = localStorage.getItem('ghostlink_my_id');
    if (!savedId) {
      savedId = 'ghost-' + Math.random().toString(36).substr(2, 6);
      localStorage.setItem('ghostlink_my_id', savedId);
    }
    
    const peer = new Peer(savedId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('open', (id: string) => {
      console.log('My Peer ID:', id);
      setMyId(id);
      setPeerServerStatus('connected');
      setStatus(ConnectionStatus.DISCONNECTED);
      localStorage.setItem('ghostlink_my_id', id);
    });

    peer.on('connection', (conn: any) => {
      console.log('[PeerJS] Incoming connection from:', conn.peer);
      manageConnection(conn);
    });

    peer.on('disconnected', () => {
        console.warn('[PeerJS] Disconnected from signalling server.');
        setPeerServerStatus('disconnected');
        // Auto-reconnect logic
        setTimeout(() => {
            if (peer && !peer.destroyed) peer.reconnect();
        }, 2000);
    });

    peer.on('error', (err: any) => {
      console.error('[PeerJS] Error:', err);
      if (err.type === 'peer-unavailable') {
         if (status === ConnectionStatus.CONNECTING) {
             showToast('Người dùng này đang Offline hoặc ID không đúng.', 'error');
             setStatus(ConnectionStatus.DISCONNECTED);
             setMode(AppMode.MAIN);
             setWaitingForApproval(false);
         }
      } else if (err.type === 'unavailable-id') {
         const newId = 'ghost-' + Math.random().toString(36).substr(2, 6);
         localStorage.setItem('ghostlink_my_id', newId);
         window.location.reload();
      } else if (err.type === 'network' || err.type === 'disconnected') {
          setPeerServerStatus('disconnected');
      }
    });

    peerRef.current = peer;

    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // --- LOGIC ---

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    const updated = { ...userSettings, ...newSettings };
    setUserSettings(updated);
    localStorage.setItem('ghostlink_settings', JSON.stringify(updated));
  };

  useEffect(() => {
    const prepareKey = async () => {
      if (encryptionMode === EncryptionMode.AES_256 && sharedSecret) {
        try {
          const key = await deriveKey(sharedSecret);
          setCryptoKey(key);
        } catch (e) {
          console.error("Failed to derive key", e);
        }
      } else {
        setCryptoKey(null);
      }
    };
    prepareKey();
  }, [encryptionMode, sharedSecret]);

  const addContact = (id: string, name: string) => {
    if (!id || !name) return;
    const newContact: Contact = { id, name, addedAt: Date.now() };
    const updated = [...contacts.filter(c => c.id !== id), newContact];
    setContacts(updated);
    contactsRef.current = updated; // Sync ref immediately
    localStorage.setItem('ghostlink_contacts', JSON.stringify(updated));
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    setRecentPeers(prev => prev.map(p => p.id === id ? { ...p, name: name } : p));
    setShowAddContactModal(false);
    setNewContactId('');
    setNewContactName('');
  };

  const removeContact = (id: string) => {
    if(confirm('Xóa liên hệ này? Bạn sẽ cần gửi lại yêu cầu kết bạn nếu muốn chat lại.')) {
        const updated = contacts.filter(c => c.id !== id);
        setContacts(updated);
        contactsRef.current = updated; // Sync ref immediately
        localStorage.setItem('ghostlink_contacts', JSON.stringify(updated));
    }
  };

  // Edit Contact Functions
  const startEditing = (contact: Contact) => {
    setEditingContactId(contact.id);
    setEditingName(contact.name);
  };

  const saveEditing = () => {
    if (!editingContactId || !editingName.trim()) return;
    
    // Update Contacts List
    const updatedContacts = contacts.map(c => 
      c.id === editingContactId ? { ...c, name: editingName.trim() } : c
    );
    setContacts(updatedContacts);
    contactsRef.current = updatedContacts;
    localStorage.setItem('ghostlink_contacts', JSON.stringify(updatedContacts));

    // Update Recent Peers List (to sync name in chat list)
    const updatedRecents = recentPeers.map(p => 
        p.id === editingContactId ? { ...p, name: editingName.trim() } : p
    );
    setRecentPeers(updatedRecents);
    localStorage.setItem('ghostlink_recent_peers', JSON.stringify(updatedRecents));

    setEditingContactId(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingContactId(null);
    setEditingName('');
  };

  const deleteMessage = (msgId: string) => {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      
      try {
          const key = `ghostlink_chat_${targetPeerId}`;
          const history = JSON.parse(localStorage.getItem(key) || '[]');
          const newHistory = history.filter((m: any) => m.id !== msgId);
          localStorage.setItem(key, JSON.stringify(newHistory));
      } catch(e) { console.error("Failed to delete message", e); }
  };

  const clearAllChatHistory = () => {
    if (confirm("CẢNH BÁO: Xóa tất cả lịch sử?")) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ghostlink_chat_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('ghostlink_recent_peers');
      
      setRecentPeers([]);
      setMessages([]); 
      setUnreadCounts({});
      
      showToast("Đã xóa toàn bộ lịch sử.", "info");
    }
  };

  const generateInviteLink = async () => {
      const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}?invite=${myId}`;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'GhostLink Invite',
                  text: `Chat securely with me on GhostLink! ID: ${myId}`,
                  url: url
              });
              return;
          } catch(e) {}
      }
      try {
          await navigator.clipboard.writeText(url);
          showToast('Đã sao chép link mời!', 'success');
      } catch(e) {
          showToast('Không thể sao chép link.', 'error');
      }
  };

  const handleSaveSharedContact = (id: string, name: string) => {
      if (contactsRef.current.some(c => c.id === id)) {
          showToast("Liên hệ này đã có trong danh bạ.", "info");
          return;
      }
      if (id === myId) {
          showToast("Đây là ID của bạn.", "error");
          return;
      }
      addContact(id, name);
      showToast(`Đã lưu ${name} vào danh bạ.`, "success");
  };

  // --- CONNECTION MANAGEMENT ---

  const getKeyForPeer = async (peerId: string): Promise<CryptoKey | null> => {
     // Use Ref here as well for safety
     const contact = contactsRef.current.find(c => c.id === peerId);
     if (contact?.sharedSecret && contact.encryptionMode === EncryptionMode.AES_256) {
         return await deriveKey(contact.sharedSecret);
     }
     const recent = recentPeers.find(p => p.id === peerId);
     if (recent?.savedSharedSecret && recent.savedEncryptionMode === EncryptionMode.AES_256) {
         return await deriveKey(recent.savedSharedSecret);
     }
     return null;
  };

  // Centralized Connection Manager
  const manageConnection = (conn: any) => {
      const peerId = conn.peer;

      // 1. Clean up stale/duplicate connections
      const existing = connectionsRef.current.get(peerId);
      if (existing) {
          if (existing === conn) return;
          if (existing.open) {
              console.log(`[P2P] Closing old connection for ${peerId}`);
              existing.removeAllListeners?.(); 
              existing.close();
          }
          connectionsRef.current.delete(peerId);
      }

      // 2. Register new connection
      connectionsRef.current.set(peerId, conn);
      
      // 3. Attach Listeners
      conn.on('open', () => {
          console.log(`[P2P] Connection established with: ${peerId}`);
          setTargetPeerId(currentId => {
              if (currentId === peerId) setStatus(ConnectionStatus.CONNECTED);
              return currentId;
          });
      });

      conn.on('data', (data: any) => {
          handleDataFromPeer(peerId, data);
      });

      conn.on('close', () => {
          console.log(`[P2P] Connection closed: ${peerId}`);
          connectionsRef.current.delete(peerId);
          setTargetPeerId(currentId => {
              if (currentId === peerId) setStatus(ConnectionStatus.DISCONNECTED);
              return currentId;
          });
      });

      conn.on('error', (err: any) => {
          console.error(`[P2P] Connection error with ${peerId}:`, err);
          connectionsRef.current.delete(peerId);
          setTargetPeerId(currentId => {
              if (currentId === peerId) setStatus(ConnectionStatus.ERROR);
              return currentId;
          });
      });
  };

  const handleDataFromPeer = (senderId: string, data: any) => {
      const conn = connectionsRef.current.get(senderId);
      
      if (data.type === 'connection-request') {
          console.log("[P2P] RX Request from", senderId);
          if (conn && conn.open) conn.send({ type: 'request-received' });

          // USE REF HERE to prevent stale closure issues
          const existingContact = contactsRef.current.find(c => c.id === senderId);
          
          if (existingContact) {
              console.log('[P2P] Friend recognized. Auto-accepting:', senderId);
              if(conn && conn.open) {
                conn.send({ type: 'connection-accepted', name: userSettings.username });
              }
          } else {
              console.log('[P2P] Unknown peer. Triggering request:', senderId);
              setPendingRequests(prev => {
                  if (prev.find(r => r.id === senderId)) return prev;
                  return [...prev, { id: senderId, name: data.name || 'Unknown' }];
              });
              setActiveTab('contacts');
              try { if(navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch(e) {}
              showToast(`📣 Yêu cầu kết bạn từ: ${data.name || senderId}`, 'info');
          }
          return;
      }
      
      if (data.type === 'request-received') return; 

      if (data.type === 'connection-accepted') {
          setWaitingForApproval(false);
          setTargetPeerId(prev => {
              if (prev === senderId) setStatus(ConnectionStatus.CONNECTED);
              return prev;
          });
          // Only show toast if we were actively waiting or it's a new interaction
          if (mode === AppMode.CHAT) {
             showToast(`${data.name || senderId} đã kết nối!`, 'success');
          }
          return;
      }

      if (data.type === 'connection-rejected') {
          setWaitingForApproval(false);
          if (mode === AppMode.CHAT && targetPeerId === senderId) {
              setMode(AppMode.MAIN);
              showToast("Yêu cầu kết nối bị từ chối.", 'error');
          }
          if(conn) conn.close();
          return;
      }

      // --- MESSAGE HANDLING ---
      // Use Ref for validation as well
      const isKnown = contactsRef.current.some(c => c.id === senderId) || recentPeers.some(p => p.id === senderId);
      
      if (!isKnown) {
          console.warn(`[P2P] Blocked message from unknown peer: ${senderId}`);
          return; 
      }

      // CRITICAL FIX: Use Refs to check visibility. 
      // The state 'mode' inside this closure might be stale (MAIN) even if the user is in CHAT.
      const isVisible = (modeRef.current === AppMode.CHAT && targetPeerIdRef.current === senderId);

      // Pass the *calculated* isVisible directly
      processIncomingMessage(senderId, data, isVisible);
  };

  const processIncomingMessage = async (senderId: string, data: any, isVisible: boolean) => {
      if (data.type === 'message') {
          setIsPeerTyping(false);
          let content = data.content;
          
          let keyToUse = isVisible ? cryptoKey : (await getKeyForPeer(senderId));

          if (data.isEncrypted) {
              if (keyToUse) {
                  try { 
                    // If image, decrypt as binary then convert to base64 for storage/display
                    if (data.msgType === 'image') {
                        const bytes = await decryptMessage(data.content, keyToUse, true) as Uint8Array;
                        const blob = new Blob([bytes], {type: 'image/jpeg'});
                        content = await blobToBase64(blob);
                    } else {
                        content = await decryptMessage(data.content, keyToUse, false) as string; 
                    }
                  } catch (e) { 
                    content = "🔒 [Lỗi giải mã: Khóa không khớp]"; 
                    console.error("Decryption error", e);
                  }
              } else {
                  content = "🔒 [Tin nhắn được mã hóa - Thiếu khóa]";
              }
          }

          const newMessage: Message = {
            id: data.id || Math.random().toString(36).substr(2, 9),
            senderId: senderId,
            content: content,
            timestamp: Date.now(),
            type: data.msgType || 'text',
            isMe: false,
            isEncrypted: data.isEncrypted, 
            reactions: [],
            burnTimer: data.burnTimer
          };

          if (isVisible) {
              setMessages(prev => [...prev, newMessage]);
          } else {
              setUnreadCounts(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));
              if (modeRef.current !== AppMode.CHAT) {
                  showToast(`Tin nhắn mới từ ${senderId}`, 'info');
              }
          }

          if (newMessage.burnTimer && newMessage.burnTimer > 0) {
              setTimeout(() => {
                  deleteMessage(newMessage.id);
                  if (isVisible) setMessages(prev => prev.filter(m => m.id !== newMessage.id));
              }, newMessage.burnTimer * 1000);
          }

          updateHistoryAndRecents(senderId, newMessage, !isVisible);

      } else if (data.type === 'typing') {
          if (isVisible) setIsPeerTyping(data.isTyping);
      } else if (data.type === 'reaction') {
          if (isVisible) {
            const { messageId, emoji } = data;
            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    const newReactions = msg.reactions.filter(r => r.senderId !== senderId);
                    newReactions.push({ emoji, senderId: senderId });
                    return { ...msg, reactions: newReactions };
                }
                return msg;
            }));
          }
      }
  };

  const updateHistoryAndRecents = (peerId: string, message: Message, isBackground: boolean) => {
      const historyKey = `ghostlink_chat_${peerId}`;
      let history: Message[] = [];
      try { history = JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch(e) {}
      history.push(message);
      if (history.length > 100) history = history.slice(history.length - 100);
      localStorage.setItem(historyKey, JSON.stringify(history));

      let snippet = '';
      if (message.type === 'image') snippet = '📷 [Image]';
      else if (message.type === 'contact') snippet = '👤 [Contact Card]';
      else if (message.type === 'text') snippet = message.content;
      
      if (message.isEncrypted && message.content.startsWith('🔒')) snippet = '🔒 Encrypted Message';
      if (snippet.length > 30) snippet = snippet.substring(0, 30) + '...';

      setRecentPeers(prev => {
        // Use Ref here to ensure we get the latest name
        const contact = contactsRef.current.find(c => c.id === peerId);
        const nameToUse = contact ? contact.name : (prev.find(p => p.id === peerId)?.name);

        const filtered = prev.filter(p => p.id !== peerId);
        const updatedPeer: SavedPeer = { 
            id: peerId, 
            lastSeen: Date.now(), 
            snippet,
            name: nameToUse,
            savedEncryptionMode: contact?.encryptionMode,
            savedSharedSecret: contact?.sharedSecret
        };

        const updated = [updatedPeer, ...filtered];
        localStorage.setItem('ghostlink_recent_peers', JSON.stringify(updated.slice(0, 20)));
        return updated.slice(0, 20);
      });
  };
  
  const updateMessageStatus = (peerId: string, msgId: string, newStatus: 'sent' | 'error') => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: newStatus } : m));
      try {
          const key = `ghostlink_chat_${peerId}`;
          const history = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = history.map((m: any) => m.id === msgId ? { ...m, status: newStatus } : m);
          localStorage.setItem(key, JSON.stringify(updated));
      } catch(e) {}
  };

  const initiateConnection = (peerId: string) => {
      if (!peerId) return;
      if (peerId === myId) {
          showToast("Không thể kết nối với chính mình.", "error");
          return;
      }
      if (peerServerStatus === 'disconnected') {
          showToast("Bạn đang Offline. Vui lòng đợi kết nối lại Server.", "error");
          return;
      }

      // 1. CHECK FOR EXISTING OPEN CONNECTION
      const existingConn = connectionsRef.current.get(peerId);
      if (existingConn && existingConn.open) {
          console.log('[P2P] Connection already active for', peerId);
          setTargetPeerId(prev => {
              if (prev === peerId) setStatus(ConnectionStatus.CONNECTED);
              return prev;
          });
          return;
      }

      setStatus(ConnectionStatus.CONNECTING);
      setTargetPeerId(peerId);

      if (!peerRef.current || peerRef.current.destroyed) {
          showToast("Lỗi Peer JS. Vui lòng tải lại trang.", "error");
          setStatus(ConnectionStatus.ERROR);
          return;
      }

      try {
          console.log('[P2P] Initiating connection to:', peerId);
          const conn = peerRef.current.connect(peerId, { reliable: true });
          
          if (!conn) {
              setStatus(ConnectionStatus.ERROR);
              return;
          }

          manageConnection(conn);

          setTimeout(() => {
             const currentConn = connectionsRef.current.get(peerId);
             if (!currentConn || !currentConn.open) {
                 if (targetPeerId === peerId && status === ConnectionStatus.CONNECTING) {
                    setStatus(ConnectionStatus.ERROR);
                    showToast("Không thể kết nối. Đối phương có thể đang offline.", "error");
                 }
             } else {
                 // Check using REF
                 const isFriend = contactsRef.current.some(c => c.id === peerId);
                 
                 // Only set waiting if NOT a friend.
                 if (!isFriend) {
                     setWaitingForApproval(true);
                 } else {
                     setWaitingForApproval(false); // Ensure false if friend
                     console.log('[P2P] Reconnecting to friend, handshake sent.');
                 }
                 currentConn.send({ type: 'connection-request', name: userSettings.username || 'Ghost User' });
             }
          }, 2000);

      } catch (e) {
          console.error("Connection failed", e);
          setStatus(ConnectionStatus.ERROR);
      }
  };

  const sendMessage = async (content: string, type: 'text' | 'image' | 'contact' = 'text', explicitId?: string, burnTimer?: number, isEncryptedInput: boolean = false) => {
    if (waitingForApproval) {
        showToast("Đang chờ đối phương chấp nhận kết nối...", "info");
        return;
    }

    let conn = connectionsRef.current.get(targetPeerId);

    // Auto-reconnect attempt
    if (!conn || !conn.open) {
        console.log('[P2P] Connection lost, attempting reconnect before send...');
        initiateConnection(targetPeerId);
        // We can't await the connection easily here without complex promise logic,
        // so we notify user and rely on the reconnect flow.
        return; 
    }

    if (conn && conn.open) {
      const msgId = explicitId || Math.random().toString(36).substr(2, 9);
      // Determine encryption status. If input is already encrypted (e.g. image from ChatInterface), use that.
      const shouldEncrypt = !isEncryptedInput && (encryptionMode === EncryptionMode.AES_256 && !!cryptoKey);
      const finalIsEncrypted = isEncryptedInput || shouldEncrypt;
      
      const newMessage: Message = {
        id: msgId,
        senderId: myId,
        content: isEncryptedInput ? "📷 [Image Sent]" : content, // If already encrypted binary, don't show raw ciphertext in local state content (or do, if it's displayable, but binary isn't). 
                                                                 // Actually, ChatInterface handles local preview via separate means or relies on this update.
                                                                 // However, ChatInterface logic handles rendering. 
                                                                 // For images, if isEncryptedInput is true, 'content' passed here is the ciphertext. 
                                                                 // WE NEED TO STORE THE DECRYPTED/RAW VERSION LOCALLY FOR DISPLAY.
                                                                 // But 'sendMessage' is generic.
                                                                 // FIX: ChatInterface calls this. For images, if it sends encrypted data, 
                                                                 // it expects us to display the image. 
                                                                 // But we don't have the raw image here if ChatInterface did the work.
                                                                 // Wait, ChatInterface sends the *encrypted* string. 
                                                                 // We should probably rely on `ChatInterface` to manage the preview or 
                                                                 // we need to decrypt it back (inefficient) or accept a "localContent" param.
                                                                 // SIMPLIFICATION: We will assume ChatInterface handles the preview 
                                                                 // via local state or we just store the encrypted string and let it fail to render locally 
                                                                 // until reload? No.
                                                                 // Actually, if we are sending, we are "Me".
                                                                 // If I send an image, I want to see it.
                                                                 // If ChatInterface encrypted it, I only have the ciphertext here.
                                                                 // I cannot display ciphertext.
                                                                 // SOLUTION: ChatInterface should send the *encrypted* data to the peer, 
                                                                 // but locally we need the *raw* data for history.
                                                                 // But `onSendImage` only takes `content`.
                                                                 // I will rely on the fact that if it's an image, ChatInterface is sending 
                                                                 // the ciphertext. I will just store it. 
                                                                 // BUT the user won't see their own sent image.
                                                                 // RE-EVALUATION: ChatInterface has the blob. It should probably display it locally
                                                                 // before sending? No, App controls state.
                                                                 // OKAY, better approach: ChatInterface sends raw data to App. App encrypts. 
                                                                 // BUT prompt specifically asked ChatInterface to encrypt.
                                                                 // So, ChatInterface must send *both*? Or we decrypt locally?
                                                                 // Let's decrypt locally immediately for history.
        timestamp: Date.now(),
        type: type,
        isMe: true,
        isEncrypted: finalIsEncrypted,
        status: 'sending',
        reactions: [],
        burnTimer: burnTimer
      };
      
      // Special handling for local display of sent encrypted images
      if (isEncryptedInput && type === 'image' && cryptoKey) {
          // We need to show the image we just sent. But we only have ciphertext `content`.
          // We must decrypt it back to show it locally.
          try {
             const bytes = await decryptMessage(content, cryptoKey, true) as Uint8Array;
             const blob = new Blob([bytes], {type: 'image/jpeg'});
             newMessage.content = await blobToBase64(blob);
          } catch(e) {
             newMessage.content = "Error displaying sent image";
          }
      }

      setMessages(prev => [...prev, newMessage]);
      updateHistoryAndRecents(targetPeerId, newMessage, false);

      try {
          let payload: any = content;
          if (shouldEncrypt && cryptoKey) {
            payload = await encryptMessage(content, cryptoKey);
          }
          
          conn.send({ 
            type: 'message', 
            id: msgId, 
            content: payload,
            msgType: type,
            isEncrypted: finalIsEncrypted, 
            burnTimer: burnTimer 
          });
          updateMessageStatus(targetPeerId, msgId, 'sent');
      } catch (e) {
          updateMessageStatus(targetPeerId, msgId, 'error');
      }
    } else {
        showToast("Mất kết nối. Đang thử kết nối lại...", "error");
    }
  };

  const startChat = (peerId: string) => {
      setTargetPeerId(peerId);
      setUnreadCounts(prev => {
          const next = {...prev};
          delete next[peerId];
          return next;
      });

      const conn = connectionsRef.current.get(peerId);
      
      // If we have an open connection, just switch view
      if (conn && conn.open) {
          console.log('[P2P] Switching view to existing connection:', peerId);
          setStatus(ConnectionStatus.CONNECTED);
          setMode(AppMode.CHAT);
          return;
      }

      // Otherwise connect
      initiateConnection(peerId);
      setMode(AppMode.CHAT); 
  };

  const acceptRequest = (req: {id: string, name: string}) => {
      addContact(req.id, req.name);
      
      const conn = connectionsRef.current.get(req.id);
      if (conn && conn.open) {
          conn.send({ type: 'connection-accepted', name: userSettings.username });
          showToast(`Đã kết nối với ${req.name}!`, 'success');
      } else {
          showToast(`Đã thêm ${req.name}. Hãy thử chat để kết nối lại.`, 'info');
          initiateConnection(req.id);
      }
      setPendingRequests(prev => prev.filter(r => r.id !== req.id));
  };

  const rejectRequest = (id: string) => {
      const conn = connectionsRef.current.get(id);
      if (conn && conn.open) {
          conn.send({ type: 'connection-rejected' });
          setTimeout(() => conn.close(), 100);
      }
      setPendingRequests(prev => prev.filter(r => r.id !== id));
      connectionsRef.current.delete(id);
  };

  const handleRefresh = async () => {
     // Re-check connections or server status
     if (peerRef.current && peerRef.current.disconnected) {
         peerRef.current.reconnect();
         setPeerServerStatus('disconnected'); // temporary visual until reconnected
     }
     
     // Force refresh of recent peers list from storage to ensure sync
     try {
        const savedPeers = localStorage.getItem('ghostlink_recent_peers');
        if (savedPeers) setRecentPeers(JSON.parse(savedPeers));
     } catch(e) {}
     
     // Simulate network delay for UX
     await new Promise(resolve => setTimeout(resolve, 1000));
  };

  // --- RENDER LOGIC ---

  const isCyber = userSettings.theme === 'cyber';
  const colors = {
      bg: isCyber ? 'bg-cyber-black' : 'bg-neutral-900',
      text: isCyber ? 'text-white' : 'text-gray-100',
      dim: isCyber ? 'text-gray-500' : 'text-gray-400',
      accent: isCyber ? 'text-cyber-neon' : 'text-white',
      border: isCyber ? 'border-gray-800' : 'border-neutral-800',
      itemBg: isCyber ? 'bg-gray-900/50' : 'bg-neutral-800/50',
  };

  // Helper for ChatsTab to check online status
  const checkIsOnline = (id: string) => {
      const conn = connectionsRef.current.get(id);
      return !!(conn && conn.open);
  };

  // VIEW: CHAT INTERFACE
  if (mode === AppMode.CHAT) {
    // Resolve peer name directly in render to ensure freshness
    const contact = contacts.find(c => c.id === targetPeerId);
    const recent = recentPeers.find(p => p.id === targetPeerId);
    const peerName = contact?.name || recent?.name || targetPeerId;

    return (
      <MobileWrapper theme={userSettings.theme}>
        <ToastContainer toasts={toasts} />
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden relative">
                {waitingForApproval ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                         <div className="absolute top-4 left-4 z-50">
                             <Button variant="ghost" onClick={() => { setMode(AppMode.MAIN); }}>
                                <ChevronLeft /> Back
                             </Button>
                        </div>
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isCyber ? 'bg-gray-900 text-cyber-neon animate-pulse-fast' : 'bg-gray-800 text-white'}`}>
                            <Clock size={40} />
                        </div>
                        <h2 className={`font-bold text-xl mb-2 ${colors.accent}`}>Đang chờ chấp nhận...</h2>
                        <p className={`text-sm mb-6 ${colors.dim}`}>
                            Đã gửi yêu cầu kết bạn tới <b>{targetPeerId}</b>. <br/>
                            Họ cần đồng ý trước khi cuộc trò chuyện có thể bắt đầu.
                        </p>
                        <Button variant="danger" onClick={() => { setMode(AppMode.MAIN); setStatus(ConnectionStatus.DISCONNECTED); }}>
                            Hủy yêu cầu
                        </Button>
                    </div>
                ) : (
                    <ChatInterface
                        messages={messages}
                        contacts={contacts}
                        status={status}
                        myId={myId}
                        peerId={targetPeerId}
                        peerName={peerName} // Pass name here
                        isPeerTyping={isPeerTyping}
                        encryptionMode={encryptionMode}
                        cryptoKey={cryptoKey} // Pass key
                        theme={userSettings.theme}
                        burnTimer={userSettings.burnTimer}
                        onDeleteMessage={deleteMessage}
                        onSendMessage={(id, text) => sendMessage(text, 'text', id, userSettings.burnTimer)}
                        onSendImage={(id, content, isEncrypted) => sendMessage(content, 'image', id, userSettings.burnTimer, isEncrypted)}
                        onSendContact={(id, data) => sendMessage(data, 'contact', id, userSettings.burnTimer)}
                        onTyping={(isTyping) => {
                            const conn = connectionsRef.current.get(targetPeerId);
                            if(conn?.open) conn.send({type:'typing', isTyping});
                        }}
                        onReaction={(mId, e) => {
                            const conn = connectionsRef.current.get(targetPeerId);
                            if(conn?.open) conn.send({type:'reaction', messageId: mId, emoji: e});
                            setMessages(prev => prev.map(msg => {
                                if (msg.id === mId) {
                                    const newReactions = msg.reactions.filter(r => r.senderId !== myId);
                                    newReactions.push({ emoji: e, senderId: myId });
                                    return { ...msg, reactions: newReactions };
                                }
                                return msg;
                            }));
                        }}
                        onDisconnect={() => setMode(AppMode.MAIN)}
                        onBack={() => setMode(AppMode.MAIN)}
                        onClearChat={() => { localStorage.removeItem(`ghostlink_chat_${targetPeerId}`); setMessages([]); }}
                        onSaveSession={(name) => addContact(targetPeerId, name)}
                        onAddSharedContact={handleSaveSharedContact}
                    />
                )}
            </div>
        </div>
      </MobileWrapper>
    );
  }

  // VIEW: MAIN (TABS)
  return (
    <MobileWrapper theme={userSettings.theme}>
      <ToastContainer toasts={toasts} />
      <div className={`flex flex-col h-full ${colors.text}`}>
        
        <TopBar 
            myId={myId} 
            serverStatus={peerServerStatus} 
            isCyber={isCyber} 
            colors={colors} 
            onGenerateInvite={generateInviteLink} 
        />

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 relative">
            
            {activeTab === 'chats' && (
                <ChatsTab 
                    recentPeers={recentPeers}
                    contacts={contacts}
                    unreadCounts={unreadCounts}
                    checkIsOnline={checkIsOnline}
                    onStartChat={startChat}
                    onShowAddModal={() => setShowAddContactModal(true)}
                    onGotoContacts={() => setActiveTab('contacts')}
                    onRefresh={handleRefresh}
                    isCyber={isCyber}
                    colors={colors}
                />
            )}

            {activeTab === 'contacts' && (
                <ContactsTab 
                    contacts={contacts}
                    pendingRequests={pendingRequests}
                    editingContactId={editingContactId}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    onAcceptRequest={acceptRequest}
                    onRejectRequest={rejectRequest}
                    onStartEditing={startEditing}
                    onSaveEditing={saveEditing}
                    onCancelEditing={cancelEditing}
                    onRemoveContact={removeContact}
                    onStartChat={startChat}
                    onShowAddModal={() => setShowAddContactModal(true)}
                    isCyber={isCyber}
                    colors={colors}
                />
            )}

            {activeTab === 'settings' && (
                <SettingsTab 
                    userSettings={userSettings}
                    updateSettings={updateSettings}
                    onClearHistory={clearAllChatHistory}
                    isCyber={isCyber}
                    colors={colors}
                />
            )}
        </div>

        <AddContactModal 
            isOpen={showAddContactModal}
            onClose={() => setShowAddContactModal(false)}
            newContactId={newContactId}
            setNewContactId={setNewContactId}
            newContactName={newContactName}
            setNewContactName={setNewContactName}
            onSubmit={() => {
                if (newContactId && newContactName) {
                    addContact(newContactId, newContactName);
                    initiateConnection(newContactId);
                    showToast("Đã thêm và đang kết nối...", "success");
                }
                else if (newContactId && !newContactName) startChat(newContactId);
            }}
            isCyber={isCyber}
        />

        <BottomNav 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            unreadCount={(Object.values(unreadCounts) as number[]).reduce((a: number, b: number) => a + b, 0)}
            pendingRequestsCount={pendingRequests.length}
            isCyber={isCyber}
            colors={colors}
        />
      </div>
    </MobileWrapper>
  );
};

export default App;