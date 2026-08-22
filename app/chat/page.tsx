'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import AppShell from '@/components/layout/AppShell';
import { Search, Settings, MailPlus, MessageSquare, User, ArrowLeft, Send } from 'lucide-react';

interface ProfileResult {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const supabase = getSupabaseClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Active chat state
  const [activeUser, setActiveUser] = useState<ProfileResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Get current logged in user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    }
    void getUser();
  }, [supabase]);

  // Search users from profiles table when query changes
  useEffect(() => {
    async function searchUsers() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      const query = searchQuery.trim().toLowerCase();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
      }
      setSearching(false);
    }

    const timer = setTimeout(() => {
      void searchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, supabase]);

  // Fetch messages between current user and selected user
  const fetchMessages = useCallback(async (receiverId: string, userId: string) => {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Fetch error:", error.message);
      return;
    }

    if (data) {
      // Filter strictly for this active conversation pair
      const filtered = data.filter(
        (m: Message) =>
          (m.sender_id === userId && m.receiver_id === receiverId) ||
          (m.sender_id === receiverId && m.receiver_id === userId)
      );
      setMessages(filtered);
    }
  }, [supabase]);

  // Handle active user selection and setup realtime listener
  useEffect(() => {
    if (!activeUser || !currentUserId) return;

    void fetchMessages(activeUser.id, currentUserId);

    // Realtime channel for instant incoming messages
    const channel = supabase
      .channel(`chat:${currentUserId}-${activeUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload: { new: Message }) => {
          const newMsg = payload.new;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === activeUser.id) ||
            (newMsg.sender_id === activeUser.id && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeUser, currentUserId, fetchMessages, supabase]);

  function handleSelectUser(user: ProfileResult) {
    setActiveUser(user);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeUser || !currentUserId || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('direct_messages').insert({
      sender_id: currentUserId,
      receiver_id: activeUser.id,
      content: text,
    });

    if (error) {
      alert("Failed to send message: " + error.message);
    }
    setSending(false);
  }

  return (
    <AppShell>
      <div className="w-full min-h-screen bg-black text-white pb-20 flex flex-col">
        {activeUser ? (
          /* Single Chat Conversation View */
          <div className="flex-1 flex flex-col h-full min-h-screen">
            {/* Header with back button */}
            <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 w-full">
              <button onClick={() => setActiveUser(null)} className="p-1 hover:bg-white/10 rounded-full transition">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {activeUser.avatar_url ? (
                  <img src={activeUser.avatar_url} alt={activeUser.username || ''} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-white/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm truncate">{activeUser.full_name || activeUser.username}</h2>
                <p className="text-[10px] text-white/40 truncate">@{activeUser.username}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-10">
                  Say hi to @{activeUser.username || 'user'}! Start the conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-xs ${
                        isMe ? 'bg-[#f5b942] text-black font-medium rounded-br-none' : 'bg-white/10 text-white rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black sticky bottom-16 flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Start a new message"
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#f5b942]"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-[#f5b942] text-black rounded-full hover:opacity-90 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Main Inbox View */
          <>
            {/* X Header */}
            <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 w-full">
              <h1 className="text-xl font-bold tracking-wide">Messages</h1>
              <div className="flex items-center gap-4 text-white/80">
                <button className="hover:text-white transition">
                  <Settings className="h-5 w-5" />
                </button>
                <button className="hover:text-[#f5b942] transition">
                  <MailPlus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* X Search Bar */}
            <div className="p-3 w-full">
              <div className="relative flex items-center w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 focus-within:border-[#f5b942] focus-within:bg-black transition">
                <Search className="h-4 w-4 text-white/40 mr-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Direct Messages or People"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 text-xs font-bold text-white/50 w-full">
              <button className="flex-1 py-3 border-b-2 border-[#f5b942] text-white">
                Primary
              </button>
              <button className="flex-1 py-3 border-b-2 border-transparent hover:text-white/80">
                Requests
              </button>
            </div>

            {/* Search Results OR Empty Inbox */}
            <div className="divide-y divide-white/10 w-full">
              {searchQuery.trim() !== '' ? (
                searching ? (
                  <div className="p-8 text-center text-white/40 text-sm">Searching users...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-white/40 text-sm">No users found matching &quot;{searchQuery}&quot;</div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="flex items-center gap-3 p-4 hover:bg-white/[0.03] cursor-pointer transition w-full"
                    >
                      <div className="h-10 w-10 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username || 'User'} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-white/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">{user.full_name || user.username || 'User'}</div>
                        <div className="text-xs text-white/40 truncate">@{user.username || 'unknown'}</div>
                      </div>
                      <button className="bg-[#f5b942] text-black font-bold text-xs px-3 py-1.5 rounded-full hover:opacity-90 transition">
                        Message
                      </button>
                    </div>
                  ))
                )
              ) : (
                <div className="p-10 text-center flex flex-col items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3 text-white/40">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Welcome to your inbox!</h2>
                  <p className="text-xs text-white/40 mt-1 max-w-xs">
                    Drop a line, share posts and more with private conversations between you and others on $ANSEM.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
