'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Heart, MessageSquare, UserPlus, Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'message' | 'follow';
  read: boolean;
  created_at: string;
  post_id?: string | null;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
  };
}

export default function NotificationsPage() {
  const supabase = getSupabaseClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        read,
        created_at,
        post_id,
        actor:profiles!notifications_actor_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formatted = (data as unknown[]).map((item: any) => ({
        ...item,
        actor: Array.isArray(item.actor) ? item.actor[0] : item.actor,
      })) as NotificationItem[];

      setNotifications(formatted);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchNotifications();

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          void fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, fetchNotifications]);

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-[#f5b942]" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-400" />;
      default:
        return <Bell className="h-4 w-4 text-white/50" />;
    }
  };

  const getText = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return 'liked your post';
      case 'comment':
        return 'commented on your post';
      case 'message':
        return 'sent you a message';
      case 'follow':
        return 'started following you';
      default:
        return 'interacted with you';
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#f5b942]" />
          Notifications
        </h1>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="flex items-center gap-1.5 text-xs font-medium text-[#f5b942] hover:underline"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-white/40">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="py-12 text-center text-sm text-white/40">No notifications yet</div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((item) => {
            const targetHref = item.type === 'message' ? '/chat' : item.post_id ? `/community` : `/profile/${item.actor?.username}`;

            return (
              <Link
                key={item.id}
                href={targetHref}
                className={`flex items-start justify-between rounded-xl border p-3.5 transition ${
                  item.read
                    ? 'border-white/5 bg-white/[0.02] text-white/70'
                    : 'border-[#f5b942]/30 bg-[#f5b942]/5 text-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    {item.actor?.avatar_url ? (
                      <img
                        src={item.actor.avatar_url}
                        alt={item.actor.display_name}
                        className="h-10 w-10 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                        {item.actor?.display_name ? item.actor.display_name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-black p-1 border border-white/10">
                      {getIcon(item.type)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm">
                      <span className="font-semibold text-white">
                        {item.actor?.display_name || item.actor?.username || 'Someone'}
                      </span>{' '}
                      <span className="text-white/70">{getText(item.type)}</span>
                    </p>
                    <span className="text-[11px] text-white/30">
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {!item.read && (
                  <span className="h-2 w-2 rounded-full bg-[#f5b942] shrink-0 mt-2" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
