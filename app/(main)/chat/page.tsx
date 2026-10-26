'use client';
import { notify } from '@/lib/notify';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { enqueueAction, getQueuedMessages, removeQueuedAction } from '@/lib/offlineQueue';
import FollowBackButton from '@/components/chat/FollowBackButton';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Search, Settings, MailPlus, MessageSquare, User, ArrowLeft, Send, ImagePlus } from 'lucide-react';

interface ProfileResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read?: boolean;
  status?: 'sending' | 'failed';
  delivered_at?: string | null;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
}

interface ConversationPreview {
  user: ProfileResult;
  lastMessage: string;
  lastMessageAt: string;
  isMine: boolean;
  unreadCount: number;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const MSG_PAGE = 30;

export default function ChatPage() {
  const supabase = getSupabaseClient();
  const { userId: currentUserId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);

  const { data: convData, isLoading: convLoading } = useConversations(currentUserId);
  const conversations = convData?.conversations ?? [];
  const loadingConversations = convLoading && !convData;
  const followingIds = useMemo(() => new Set(convData?.followingIds ?? []), [convData]);
  const [inboxTab, setInboxTab] = useState<'primary' | 'requests'>('primary');

  const [activeUser, setActiveUser] = useState<ProfileResult | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    lastIdRef.current = null;
  }, [activeUser?.id]);

  useEffect(() => {
    const last = messages[messages.length - 1]?.id ?? null;
    if (last && last !== lastIdRef.current) {
      const first = lastIdRef.current === null;
      lastIdRef.current = last;
      bottomRef.current?.scrollIntoView({ block: 'end', behavior: first ? 'auto' : 'smooth' });
    }
  }, [messages]);

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const queryClient = useQueryClient();
  const loadConversations = useCallback(async (userId: string) => {
    await queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
  }, [queryClient]);


  useEffect(() => {
    if (!currentUserId) return;
    const inbox = supabase
      .channel(`inbox:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => {
          void loadConversations(currentUserId);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(inbox);
    };
  }, [currentUserId, loadConversations, supabase]);

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
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (!error && data) {
        setSearchResults(data as ProfileResult[]);
      } else if (error) {
        console.error('Search users error:', error.message);
      }
      setSearching(false);
    }

    const timer = setTimeout(() => {
      void searchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, supabase]);

  const fetchMessages = useCallback(async (receiverId: string, userId: string) => {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE);

    if (error) {
      console.error('Fetch error:', error.message);
      return;
    }

    const rows = (data ?? []) as Message[];
    setHasOlder(rows.length === MSG_PAGE);
    const queued = await getQueuedMessages(userId, receiverId);
    setMessages([
      ...rows.reverse(),
      ...queued.map((qm) => ({
        id: 'q-' + qm.id,
        sender_id: userId,
        receiver_id: receiverId,
        content: qm.content ?? '',
        created_at: new Date(qm.at).toISOString(),
        read: false,
        status: (qm.failed ? 'failed' : 'sending') as 'sending' | 'failed',
      })),
    ]);

    await supabase
      .from('direct_messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('sender_id', receiverId)
      .eq('receiver_id', userId)
      .eq('read', false);
  }, [supabase]);

  useEffect(() => {
    if (!activeUser || !currentUserId) return;

    void fetchMessages(activeUser.id, currentUserId);

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
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const rest = prev.filter(
                (m) => !(m.status === 'sending' && m.sender_id === newMsg.sender_id && m.content === newMsg.content)
              );
              return [...rest, newMsg];
            });
            if (newMsg.sender_id === activeUser.id) {
              void supabase
                .from('direct_messages')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('id', newMsg.id);
            }
            if (currentUserId) void loadConversations(currentUserId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload: { new: Message }) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? { ...m, read: updated.read, delivered_at: updated.delivered_at, read_at: updated.read_at }
                : m
            )
          );
        }
      )
      .subscribe();

    const typingChannel = supabase
      .channel(`typing:${[currentUserId, activeUser.id].sort().join('-')}`)
      .on('broadcast', { event: 'typing' }, (payload: { payload: { userId: string } }) => {
        if (payload.payload.userId === activeUser.id) {
          setIsOtherTyping(true);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setIsOtherTyping(false), 3500);
        }
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(typingChannel);
    };
  }, [activeUser, currentUserId, fetchMessages, supabase, loadConversations]);

  async function loadOlder() {
    if (!activeUser || !currentUserId || loadingOlder || !hasOlder) return;
    const oldest = messages.find((m) => !m.id.startsWith('tmp-') && !m.id.startsWith('q-'));
    if (!oldest) return;
    setLoadingOlder(true);
    const prevHeight = document.documentElement.scrollHeight;
    const prevY = window.scrollY;
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUser.id}),and(sender_id.eq.${activeUser.id},receiver_id.eq.${currentUserId})`
      )
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(MSG_PAGE);
    if (!error && data) {
      const rows = data as Message[];
      setHasOlder(rows.length === MSG_PAGE);
      const older = rows.reverse();
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !ids.has(m.id)), ...prev];
      });
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          window.scrollTo({ top: prevY + (document.documentElement.scrollHeight - prevHeight) })
        )
      );
    }
    setLoadingOlder(false);
  }

  const fetchMessagesRef = useRef<typeof fetchMessages | null>(null);
  fetchMessagesRef.current = fetchMessages;
  useEffect(() => {
    const onFailed = () => {
      if (activeUser && currentUserId) void fetchMessagesRef.current?.(activeUser.id, currentUserId);
    };
    window.addEventListener('bbl-queue-failed', onFailed);
    return () => window.removeEventListener('bbl-queue-failed', onFailed);
  }, [activeUser, currentUserId]);

  const lastTypingSentRef = useRef(0);
  function handleTyping() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    if (typingChannelRef.current && currentUserId) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId },
      });
    }
  }

  function handleSelectUser(user: ProfileResult) {
    setActiveUser(user);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function deliver(tempId: string, receiverId: string, text: string) {
    if (!currentUserId) return;
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'sending' } : m)));

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      void enqueueAction({ type: 'message', postId: receiverId, userId: currentUserId, content: text });
      return;
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: currentUserId, receiver_id: receiverId, content: text })
      .select()
      .single();

    if (error || !data) {
      if ((error && !error.code) || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        void enqueueAction({ type: 'message', postId: receiverId, userId: currentUserId, content: text });
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      return;
    }

    const real = data as Message;
    setMessages((prev) =>
      prev.some((m) => m.id === real.id)
        ? prev.filter((m) => m.id !== tempId)
        : prev.map((m) => (m.id === tempId ? real : m))
    );
    void loadConversations(currentUserId);

    await supabase.from('notifications').insert({
      user_id: receiverId,
      actor_id: currentUserId,
      type: 'message',
      post_id: null,
      read: false,
    });
  }

  function retrySend(m: Message) {
    if (m.id.startsWith('q-')) void removeQueuedAction(m.id.slice(2));
    void deliver(m.id, m.receiver_id, m.content);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !activeUser || !currentUserId) return;

    setNewMessage('');
    const tempId = 'tmp-' + crypto.randomUUID();
    const receiverId = activeUser.id;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: text,
        created_at: new Date().toISOString(),
        read: false,
        status: 'sending',
      },
    ]);
    await deliver(tempId, receiverId, text);
  }

  async function handleSendImage(file: File) {
    if (!activeUser || !currentUserId) return;
    const fileName = `${currentUserId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file);

    if (uploadError) {
      notify('Upload failed: ' + uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);

    await supabase.from('direct_messages').insert({
      sender_id: currentUserId,
      receiver_id: activeUser.id,
      content: '',
      attachment_url: urlData.publicUrl,
      attachment_type: 'image',
    });
    void loadConversations(currentUserId);
  }

  return (
    <>
      <div className="w-full min-h-screen bg-[#f7f5f2] text-stone-900 pb-20 flex flex-col">
        {activeUser ? (
          <div className="flex-1 flex flex-col h-full min-h-screen">
            <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-[#f7f5f2]/80 backdrop-blur-md border-b border-stone-900/10 w-full">
              <button onClick={() => { setActiveUser(null); if (currentUserId) void loadConversations(currentUserId); }} aria-label="Back to inbox" className="p-1 hover:bg-stone-900/5 rounded-full transition">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 rounded-full bg-stone-900/5 overflow-hidden flex items-center justify-center shrink-0">
                {activeUser.avatar_url ? (
                  <img src={activeUser.avatar_url} alt={activeUser.username || ''} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-stone-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm truncate">{activeUser.display_name || activeUser.username}</h2>
                <p className="text-[10px] text-stone-500 truncate">@{activeUser.username}</p>
              </div>
              {currentUserId && !followingIds.has(activeUser.id) && (
                <FollowBackButton targetId={activeUser.id} currentUserId={currentUserId} />
              )}
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {hasOlder && (
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                  className="mx-auto block rounded-full bg-stone-900/5 px-4 py-1.5 text-xs font-semibold text-stone-600 disabled:opacity-50"
                >
                  {loadingOlder ? 'Loading…' : 'Load older messages'}
                </button>
              )}
              {messages.length === 0 ? (
                <div className="text-center text-stone-500 text-xs py-10">
                  Say hi to @{activeUser.username || 'user'}! Start the conversation.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex flex-col mb-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[78%] px-3.5 py-2 rounded-[18px] text-[14px] leading-[19px] ${
                        isMe ? 'bg-[#f97316] text-black font-medium rounded-br-[4px]' : 'bg-stone-900/[0.05] text-stone-900 rounded-bl-[4px]'
                      }`}>
                        {msg.attachment_url ? (
                          <img src={msg.attachment_url} alt="attachment" className="rounded-xl max-w-[200px]" />
                        ) : (
                          msg.content
                        )}
                      </div>
                      {isMe && (
                        <span className="text-[10.5px] text-stone-400 mt-1 mr-1">
                          {msg.status === 'sending' ? (
                            'Sending…'
                          ) : msg.status === 'failed' ? (
                            <button type="button" onClick={() => retrySend(msg)} className="text-red-500">
                              Failed. Tap to retry
                            </button>
                          ) : msg.read || msg.read_at ? (
                            <span className="font-semibold text-[#f97316]">✓✓ Seen</span>
                          ) : msg.delivered_at ? (
                            '✓✓ Delivered'
                          ) : (
                            '✓ Sent'
                          )}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              {isOtherTyping && (
                <div className="text-[10px] text-stone-500 px-1">{activeUser.username} is typing…</div>
              )}
              <div ref={bottomRef} className="h-1 scroll-mb-32" />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-stone-900/10 bg-[#f7f5f2] sticky bottom-16 flex items-center gap-2">
              <label className="p-2 cursor-pointer hover:bg-stone-900/5 rounded-full transition shrink-0">
                <ImagePlus className="h-4 w-4 text-stone-600" />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && handleSendImage(e.target.files[0])}
                />
              </label>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleTyping}
                placeholder="Start a new message"
                className="flex-1 bg-white border border-stone-900/20 rounded-full px-4 py-2 text-sm text-stone-900 placeholder:text-stone-500 outline-none focus:border-[#f97316]"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-[#f97316] text-black rounded-full hover:opacity-90 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#f7f5f2]/80 backdrop-blur-md border-b border-stone-900/10 w-full">
              <h1 className="text-xl font-bold tracking-wide">Messages</h1>
              <div className="flex items-center gap-4 text-stone-800">
                <button
                  onClick={() => { window.location.href = '/chat/settings'; }}
                  className="hover:text-stone-900 transition"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button aria-label="New message" className="hover:text-[#f97316] transition">
                  <MailPlus className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-3 w-full">
              <div className="relative flex items-center w-full bg-stone-900/4 border border-stone-900/10 rounded-full px-4 py-2 focus-within:border-[#f97316] focus-within:bg-[#f7f5f2] transition">
                <Search className="h-4 w-4 text-stone-500 mr-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Direct Messages or People"
                  className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-500 outline-none"
                />
              </div>
            </div>

            <div className="flex border-b border-stone-900/10 text-xs font-bold text-stone-500 w-full">
              <button
                onClick={() => setInboxTab('primary')}
                className={`flex-1 py-3 border-b-2 transition ${
                  inboxTab === 'primary' ? 'border-[#f97316] text-stone-900' : 'border-transparent hover:text-stone-800'
                }`}
              >
                Primary
              </button>
              <button
                onClick={() => setInboxTab('requests')}
                className={`flex-1 py-3 border-b-2 transition ${
                  inboxTab === 'requests' ? 'border-[#f97316] text-stone-900' : 'border-transparent hover:text-stone-800'
                }`}
              >
                Requests
              </button>
            </div>

            <div className="divide-y divide-stone-900/5 w-full">
              {searchQuery.trim() !== '' ? (
                searching ? (
                  <div className="p-8 text-center text-stone-500 text-sm">Searching users...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-stone-500 text-sm">No users found matching &quot;{searchQuery}&quot;</div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="flex items-center gap-3 p-4 hover:bg-stone-900/[0.05] cursor-pointer transition w-full"
                    >
                      <div className="h-10 w-10 rounded-full bg-stone-900/5 overflow-hidden shrink-0 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username || 'User'} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-stone-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-stone-900 text-sm truncate">{user.display_name || user.username || 'User'}</div>
                        <div className="text-xs text-stone-500 truncate">@{user.username || 'unknown'}</div>
                      </div>
                      <button className="bg-[#f97316] text-black font-bold text-xs px-3 py-1.5 rounded-full hover:opacity-90 transition">
                        Message
                      </button>
                    </div>
                  ))
                )
              ) : loadingConversations ? (
                <div className="p-8 text-center text-stone-500 text-sm">Loading conversations...</div>
              ) : (() => {
                const filtered = conversations.filter((c) =>
                  inboxTab === 'primary' ? followingIds.has(c.user.id) : !followingIds.has(c.user.id)
                );
                if (filtered.length === 0) {
                  return (
                    <div className="p-10 text-center flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-stone-900/4 flex items-center justify-center mb-3 text-stone-500">
                        <MessageSquare className="h-6 w-6" />
                      </div>
                      <h2 className="text-lg font-bold text-stone-900">
                        {inboxTab === 'primary' ? 'Welcome to your inbox!' : 'No message requests'}
                      </h2>
                      <p className="text-xs text-stone-500 mt-1 max-w-xs">
                        {inboxTab === 'primary'
                          ? 'Drop a line, share posts and more with private conversations between you and others on Black Bull Studio.'
                          : 'Messages from people you don\'t follow will show up here.'}
                      </p>
                    </div>
                  );
                }
                return filtered.map((conv) => (
                  <div
                    key={conv.user.id}
                    onClick={() => handleSelectUser(conv.user)}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-900/[0.05] active:bg-stone-900/[0.06] active:scale-[0.99] cursor-pointer transition w-full"
                  >
                    <div className="h-12 w-12 rounded-full bg-stone-900/5 overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-stone-900/10">
                      {conv.user.avatar_url ? (
                        <img src={conv.user.avatar_url} alt={conv.user.username || 'User'} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-stone-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[14.5px] font-semibold text-stone-900 truncate">
                          {conv.user.display_name || conv.user.username || 'User'}
                        </div>
                        <span className="text-[12px] text-stone-400 shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-[13px] truncate ${conv.unreadCount > 0 ? 'text-stone-900 font-medium' : 'text-stone-500'}`}>
                          {conv.isMine ? 'You: ' : ''}{conv.lastMessage}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-[#f97316] text-black text-[11px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </div>
    </>
  );
}