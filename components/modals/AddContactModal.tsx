import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '../Button';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  newContactId: string;
  setNewContactId: (val: string) => void;
  newContactName: string;
  setNewContactName: (val: string) => void;
  onSubmit: () => void;
  isCyber: boolean;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  newContactId,
  setNewContactId,
  newContactName,
  setNewContactName,
  onSubmit,
  isCyber
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl ${isCyber ? 'bg-cyber-black border-cyber-neon' : 'bg-neutral-900 border-neutral-700'}`}>
            <h3 className="font-bold text-lg mb-4">Thêm liên hệ mới</h3>
            <div className="space-y-3">
                <div>
                    <label className="text-xs opacity-70 block mb-1">Peer ID</label>
                    <div className="flex gap-2">
                        <input 
                            value={newContactId}
                            onChange={(e) => setNewContactId(e.target.value)}
                            placeholder="d7f8..."
                            className={`flex-1 p-2 rounded border outline-none font-mono text-sm ${isCyber ? 'bg-gray-900 border-gray-700' : 'bg-neutral-800 border-neutral-700'}`}
                        />
                        <button onClick={async () => {
                            try {
                                const text = await navigator.clipboard.readText();
                                setNewContactId(text);
                            } catch(e) {}
                        }} className="p-2 border rounded hover:bg-white/10"><Copy size={16}/></button>
                    </div>
                </div>
                <div>
                    <label className="text-xs opacity-70 block mb-1">Tên gợi nhớ (Alias)</label>
                    <input 
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Ví dụ: Alice"
                        className={`w-full p-2 rounded border outline-none ${isCyber ? 'bg-gray-900 border-gray-700' : 'bg-neutral-800 border-neutral-700'}`}
                    />
                </div>
                
                <div className="flex gap-2 mt-4 pt-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1">Hủy</Button>
                    <Button onClick={onSubmit} className="flex-1">{newContactName ? 'Gửi Yêu Cầu' : 'Kết Nối'}</Button>
                </div>
            </div>
        </div>
    </div>
  );
};