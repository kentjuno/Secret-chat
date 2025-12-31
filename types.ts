
export interface Reaction {
  emoji: string;
  senderId: string;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'system' | 'contact';
  isMe: boolean;
  status?: 'sending' | 'sent' | 'error';
  isEncrypted?: boolean;
  reactions: Reaction[];
  burnTimer?: number; // Seconds until auto-delete
}

export interface Contact {
  id: string;
  name: string;
  addedAt: number;
  sharedSecret?: string; // Optional: Save key for this contact
  encryptionMode?: EncryptionMode;
}

export interface SavedPeer {
  id: string;
  name?: string; // User defined alias
  lastSeen: number;
  snippet: string;
  savedEncryptionMode?: EncryptionMode;
  savedSharedSecret?: string;
  unreadCount?: number;
}

export interface UserSettings {
  username: string;
  theme: 'cyber' | 'stealth';
  burnTimer: number; // 0 for off, seconds otherwise
}

export enum AppMode {
  MAIN = 'MAIN', // Contains Tabs: Chats, Contacts, Settings
  CHAT = 'CHAT',
}

export enum ConnectionStatus {
  DISCONNECTED = 'Offline',
  CONNECTING = 'Đang kết nối...',
  CONNECTED = 'Online',
  ERROR = 'Lỗi kết nối'
}

export enum EncryptionMode {
  STANDARD = 'STANDARD', // WebRTC Default (DTLS)
  AES_256 = 'AES_256'   // Application Layer E2EE
}