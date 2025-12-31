import React from 'react';
import { UserPlus, Search, UserCheck, UserX, Check, X, Edit2, MessageSquare, Trash2 } from 'lucide-react';
import { Contact } from '../../types';

interface ContactsTabProps {
  contacts: Contact[];
  pendingRequests: {id: string, name: string}[];
  editingContactId: string | null;
  editingName: string;
  setEditingName: (val: string) => void;
  onAcceptRequest: (req: {id: string, name: string}) => void;
  onRejectRequest: (id: string) => void;
  onStartEditing: (c: Contact) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onRemoveContact: (id: string) => void;
  onStartChat: (id: string) => void;
  onShowAddModal: () => void;
  isCyber: boolean;
  colors: any;
}

export const ContactsTab: React.FC<ContactsTabProps> = ({
  contacts,
  pendingRequests,
  editingContactId,
  editingName,
  setEditingName,
  onAcceptRequest,
  onRejectRequest,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onRemoveContact,
  onStartChat,
  onShowAddModal,
  isCyber,
  colors
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
        
        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
            <div className={`p-4 rounded-xl border ${isCyber ? 'bg-gray-900/50 border-cyber-neon/50' : 'bg-white/5 border-white/20'} mb-4 animate-bounce-subtle`}>
                <h3 className={`font-bold text-xs uppercase mb-3 flex items-center gap-2 ${colors.accent}`}>
                    <UserPlus size={14} /> Yêu cầu kết bạn ({pendingRequests.length})
                </h3>
                <div className="space-y-2">
                    {pendingRequests.map(req => (
                        <div key={req.id} className="flex flex-col gap-2 p-3 bg-black/20 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm">{req.name}</span>
                                <span className="text-[10px] font-mono opacity-50 truncate w-20">{req.id}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onAcceptRequest(req)}
                                    className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 ${isCyber ? 'bg-cyber-neon text-black hover:bg-white' : 'bg-white text-black'}`}
                                >
                                    <UserCheck size={12} /> Chấp nhận
                                </button>
                                <button 
                                    onClick={() => onRejectRequest(req.id)}
                                    className="flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 bg-red-500/20 text-red-500 hover:bg-red-500/40"
                                >
                                    <UserX size={12} /> Từ chối
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm danh bạ..." 
                    className={`w-full p-2.5 pl-9 rounded-lg text-sm border outline-none ${isCyber ? 'bg-gray-900 border-gray-800 focus:border-cyber-neon' : 'bg-neutral-800 border-neutral-700'}`}
                />
            </div>
            <button 
                onClick={onShowAddModal}
                className={`p-2.5 rounded-lg border ${isCyber ? 'border-cyber-neon/30 text-cyber-neon hover:bg-cyber-neon/10' : 'border-white/30 text-white hover:bg-white/10'}`}
            >
                <UserPlus size={18} />
            </button>
        </div>

        <div className="space-y-2">
            {contacts.length === 0 && (
                 <div className="text-center py-8 opacity-50 text-xs">Chưa lưu liên hệ nào.</div>
            )}
            {contacts.map(contact => (
                <div key={contact.id} className={`flex items-center justify-between p-3 rounded-xl border ${colors.border} ${colors.itemBg}`}>
                    {editingContactId === contact.id ? (
                        <div className="flex items-center gap-2 flex-1 w-full animate-in fade-in zoom-in-95 duration-200">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isCyber ? 'bg-cyber-neon/20 text-cyber-neon' : 'bg-white/20 text-white'}`}>
                                {editingName.substring(0,1).toUpperCase() || '?'}
                            </div>
                            <input 
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className={`flex-1 p-2 rounded text-sm border outline-none min-w-0 ${isCyber ? 'bg-gray-900 border-cyber-neon text-white' : 'bg-white border-gray-300 text-black'}`}
                                autoFocus
                                placeholder="New alias..."
                            />
                            <button onClick={onSaveEditing} className="p-2 bg-green-500/20 text-green-500 rounded hover:bg-green-500/40"><Check size={16}/></button>
                            <button onClick={onCancelEditing} className="p-2 bg-red-500/20 text-red-500 rounded hover:bg-red-500/40"><X size={16}/></button>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 flex-1" onClick={() => onStartChat(contact.id)}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isCyber ? 'bg-cyber-neon/20 text-cyber-neon' : 'bg-white/20 text-white'}`}>
                                    {contact.name.substring(0,1).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{contact.name}</p>
                                    <p className="text-[10px] font-mono opacity-50 truncate w-32">{contact.id}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onStartEditing(contact); }} className="p-2 hover:bg-blue-500/20 rounded text-blue-500"><Edit2 size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onStartChat(contact.id); }} className="p-2 hover:bg-green-500/20 rounded text-green-500"><MessageSquare size={16} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onRemoveContact(contact.id); }} className="p-2 hover:bg-red-500/20 rounded text-red-500"><Trash2 size={16} /></button>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};