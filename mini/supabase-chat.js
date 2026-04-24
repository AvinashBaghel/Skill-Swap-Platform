// =====================================================================
//  SkillSwap — Supabase Real-Time Chat Module
//  Handles: fetching, sending, and subscribing to live messages
// =====================================================================

// ─── Active subscription reference (so we can unsubscribe later) ─────
let _chatSubscription = null;

// ─── Backend API base URL ────────────────────────────────────────────
const CHAT_API_BASE = 'http://localhost:5000/api';

// ─────────────────────────────────────────────────────────────────────
//  Fetch all messages between two users (sorted by time)
//  Tries Supabase first, falls back to backend API
// ─────────────────────────────────────────────────────────────────────
async function fetchMessages(userId1, userId2) {
  // 1. Try Supabase direct query
  try {
    if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),` +
          `and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`
        )
        .order('created_at', { ascending: true });

      if (!error && data) {
        console.log(`[Chat] Loaded ${data.length} messages via Supabase`);
        return data;
      }
      console.warn('[Chat] Supabase fetch failed:', error?.message);
    }
  } catch (err) {
    console.warn('[Chat] Supabase fetch exception:', err);
  }

  // 2. Fallback: fetch via backend API
  try {
    const res = await fetch(`${CHAT_API_BASE}/chat/${userId2}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId1
      }
    });
    if (!res.ok) {
      console.error('[Chat] Backend fetch failed:', res.status);
      return [];
    }
    const msgs = await res.json();
    console.log(`[Chat] Loaded ${msgs.length} messages via backend API`);
    // Map backend response to match Supabase row shape
    return msgs.map(m => ({
      id:          m.id || (`${m.from}-${m.timestamp}-${m.text}`.slice(0, 80)),
      sender_id:   m.from,
      receiver_id: m.from === userId1 ? userId2 : userId1,
      message:     m.text,
      created_at:  m.timestamp
    }));
  } catch (err) {
    console.error('[Chat] Backend fetch exception:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Send a message via backend API
//  (Backend uses the service key, bypassing RLS — avoids double-insert)
// ─────────────────────────────────────────────────────────────────────
async function sendMessage(senderId, receiverId, messageText) {
  try {
    const res = await fetch(`${CHAT_API_BASE}/chat/${receiverId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': senderId
      },
      body: JSON.stringify({ text: messageText, userId: senderId })
    });

    if (!res.ok) {
      console.error('[Chat] Send failed:', res.status);
      return null;
    }

    const result = await res.json();
    console.log('[Chat] Message sent via backend API');
    return {
      id:          result.id || (`${senderId}-${result.timestamp}-${messageText}`.slice(0, 80)),
      sender_id:   senderId,
      receiver_id: receiverId,
      message:     messageText,
      created_at:  result.timestamp || new Date().toISOString()
    };
  } catch (err) {
    console.error('[Chat] Send exception:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Subscribe to real-time messages between two users
//  onNewMessage(msg) is called whenever a new row appears
// ─────────────────────────────────────────────────────────────────────
function subscribeToChat(userId1, userId2, onNewMessage) {
  // Unsubscribe from any previous chat
  unsubscribeChat();

  // Only subscribe if Supabase client is available
  if (typeof supabase === 'undefined' || !supabase || typeof supabase.channel !== 'function') {
    console.warn('[Chat] Supabase client not available — real-time updates disabled');
    return;
  }

  const channelName = `chat-${[userId1, userId2].sort().join('-')}`;

  _chatSubscription = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        // Listen for messages where EITHER user is the sender
        // We'll filter on the client side to be safe
      },
      (payload) => {
        const msg = payload.new;
        // Only process messages that belong to this conversation
        const isOurs =
          (msg.sender_id === userId1 && msg.receiver_id === userId2) ||
          (msg.sender_id === userId2 && msg.receiver_id === userId1);

        if (isOurs) {
          console.log('[Chat] Real-time message:', msg.id);
          onNewMessage(msg);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Chat] Subscription status: ${status}`);
    });

  console.log(`[Chat] Subscribed to channel: ${channelName}`);
}

// ─────────────────────────────────────────────────────────────────────
//  Unsubscribe from real-time updates
// ─────────────────────────────────────────────────────────────────────
function unsubscribeChat() {
  if (_chatSubscription) {
    supabase.removeChannel(_chatSubscription);
    _chatSubscription = null;
    console.log('[Chat] Unsubscribed from previous channel');
  }
}

// ─────────────────────────────────────────────────────────────────────
//  Format timestamp to readable time (e.g. "2:30 PM")
// ─────────────────────────────────────────────────────────────────────
function formatChatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
