'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MessageSquare, Send } from 'lucide-react';

type MessageItem = {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_avatar?: string | null;
  receiver_id: number;
  receiver_username: string;
  receiver_avatar?: string | null;
  content: string;
  created_at: string;
  is_read: boolean;
};

type PartnerItem = {
  user_id: number;
  username: string;
  avatar_url?: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

function DirectMessagesContent() {
  const searchParams = useSearchParams();
  const initialTo = searchParams.get('to') || searchParams.get('user') || 'crin_listener';
  const { data: session } = useSession();

  const [activePartner, setActivePartner] = useState<string>(initialTo);
  const [conversations, setConversations] = useState<PartnerItem[]>([
    {
      user_id: 2,
      username: 'crin_listener',
      avatar_url: null,
      last_message: 'Yes! The pinna gain adjustment is super clean. Bass shelf is crisp.',
      last_message_at: new Date(Date.now() - 1800 * 1000).toISOString(),
      unread_count: 0,
    },
    {
      user_id: 3,
      username: 'cable_artisan',
      avatar_url: null,
      last_message: 'Your custom 4.4mm balanced cable order has shipped!',
      last_message_at: new Date(Date.now() - 7200 * 1000).toISOString(),
      unread_count: 1,
    },
    {
      user_id: 4,
      username: 'sound_purist',
      avatar_url: null,
      last_message: 'Which USB-C Dongle DAC are you running currently?',
      last_message_at: new Date(Date.now() - 14400 * 1000).toISOString(),
      unread_count: 0,
    },
  ]);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch active conversations
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch('/api/messages/fetch');
        if (res.ok) {
          const data = await res.json();
          if (data.conversations && data.conversations.length > 0) {
            setConversations(data.conversations);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch conversations:', err);
      }
    }
    loadConversations();
  }, []);

  // Fetch messages for selected chat partner
  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      try {
        const res = await fetch(`/api/messages/fetch?with_user=${encodeURIComponent(activePartner)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            // Default initial message stream if empty
            setMessages([
              {
                id: 101,
                sender_id: 2,
                sender_username: activePartner,
                receiver_id: 1,
                receiver_username: 'alex_dev',
                content: `Hey! Welcome to direct messages with u/${activePartner}.`,
                created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
                is_read: true,
              },
            ]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, [activePartner]);

  // Send new message
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || sending) return;

    const newMsgText = inputContent.trim();
    setInputContent('');
    setSending(true);

    // Optimistic UI update
    const tempMsg: MessageItem = {
      id: Date.now(),
      sender_id: 1,
      sender_username: 'alex_dev',
      receiver_id: 99,
      receiver_username: activePartner,
      content: newMsgText,
      created_at: new Date().toISOString(),
      is_read: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_username: activePartner,
          content: newMsgText,
        }),
      });

      if (!res.ok) {
        console.warn('Message send API error');
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="bg-white border border-[#eaefec] rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[550px] font-sans">
      
      {/* ── Left Pane: Active Conversations ──────────────────────────────── */}
      <div className="w-full md:w-80 border-r border-[#eaefec] flex flex-col bg-[#f8faf9] flex-shrink-0">
        
        {/* Header */}
        <div className="p-4 border-b border-[#eaefec] bg-white flex items-center justify-between">
          <h2 className="font-extrabold text-sm text-[#111827] flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#10b981]" /> Direct Messages
          </h2>
          <span className="text-[10px] font-bold text-[#10b981] bg-[#e6f7f0] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
            Live Chat
          </span>
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {conversations.map((partner) => {
            const isActive = activePartner.toLowerCase() === partner.username.toLowerCase();
            return (
              <button
                key={partner.username}
                onClick={() => setActivePartner(partner.username)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 ease-in-out flex items-center gap-3 ${
                  isActive
                    ? 'bg-white border border-gray-200 shadow-xs'
                    : 'hover:bg-gray-100/80 border border-transparent'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#10b981] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                  {partner.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold truncate ${isActive ? 'text-[#10b981]' : 'text-[#111827]'}`}>
                      u/{partner.username}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {getRelativeTime(partner.last_message_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate font-normal mt-0.5">
                    {partner.last_message}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* ── Right Pane: Active Chat Window ───────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Chat Window Header */}
        <div className="p-4 border-b border-[#eaefec] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#10b981] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {activePartner.charAt(0).toUpperCase()}
            </div>
            <div>
              <Link href={`/u/${activePartner}`} className="text-xs font-bold text-[#111827] hover:text-[#10b981] transition-colors">
                u/{activePartner}
              </Link>
              <span className="text-[10px] text-[#059669] block font-medium">● Online</span>
            </div>
          </div>

          <Link
            href={`/u/${activePartner}`}
            className="text-xs font-bold text-[#10b981] bg-[#e6f7f0] hover:bg-[#d1fae5] border border-[#a7f3d0] px-3.5 py-1.5 rounded-full transition-all duration-200 ease-in-out"
          >
            View Profile
          </Link>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-[#f8faf9]">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400 font-medium">
              Loading chat history...
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_username.toLowerCase() === 'alex_dev' || (session?.user?.name && msg.sender_username.toLowerCase() === session.user.name.toLowerCase());
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-[#10b981] text-white rounded-br-none'
                        : 'bg-white border border-gray-200 text-[#111827] rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-sans">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">
                    {getRelativeTime(msg.created_at)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-[#eaefec] bg-white flex items-center gap-2">
          <input
            type="text"
            required
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder={`Message u/${activePartner}...`}
            className="flex-1 bg-[#f8faf9] border border-gray-200 rounded-full px-4 py-2.5 text-xs sm:text-sm text-[#111827] placeholder:text-gray-400 focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-[#10b981]/20 focus:outline-none transition-all duration-200 ease-in-out font-sans"
          />
          <button
            type="submit"
            disabled={!inputContent.trim() || sending}
            className="bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-sm transition-all duration-200 ease-in-out active:scale-95 cursor-pointer flex-shrink-0 flex items-center gap-1.5"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
}

export default function DirectMessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading messaging engine...</div>}>
      <DirectMessagesContent />
    </Suspense>
  );
}
