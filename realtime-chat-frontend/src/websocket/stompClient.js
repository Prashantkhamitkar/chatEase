import { over } from "stompjs";
import SockJS from "sockjs-client";
import {
  addMessage,
  fetchUsers,
  setUnreadCounts,
  setOnlineUsers,
  setTypingStatus,
  markMessagesReadInStore,
  deleteMessageInStore,
  updateMessageReactionInStore,
} from "../store/slices/chatSlice";
import { store } from "../store/store";

let stompClient = null;
let currentUsername = null;
let isConnecting = false;
let subscriptions = [];

export const connectSocket = (username) => {
  if (!username) return;

  // If already connected with the same username, don't re-create the socket
  if (stompClient && stompClient.connected && currentUsername === username) {
    return;
  }

  // If already in the process of connecting with the same user, wait
  if (isConnecting && currentUsername === username) {
    return;
  }

  // Disconnect any existing connection before opening a new one
  if (stompClient) {
    disconnectSocket();
  }

  isConnecting = true;
  currentUsername = username;

  const wsUrl = import.meta.env.VITE_WS_URL || "http://localhost:9090/ws";
  const socket = new SockJS(`${wsUrl}?username=${encodeURIComponent(username)}`);
  stompClient = over(socket);
  stompClient.debug = null; // Disable noisy console logs

  stompClient.connect(
    {},
    () => {
      isConnecting = false;
      subscriptions = [];

      // 1. Private incoming & confirmed messages
      const msgSub = stompClient.subscribe("/user/queue/messages", (msg) => {
        try {
          const parsed = JSON.parse(msg.body);
          const state = store.getState();
          const activeReceiver = state.chat.receiver;
          const currentUser = state.auth.user?.username || state.chat.currentUser;

          // 🔥 If the incoming message is from the user we currently have OPEN in the chat window:
          const isFromActiveOpponent =
            activeReceiver &&
            parsed.sender?.toLowerCase() === activeReceiver.toLowerCase() &&
            parsed.receiver?.toLowerCase() === currentUser?.toLowerCase();

          if (isFromActiveOpponent && (typeof document === "undefined" || !document.hidden)) {
            parsed.read = true;
            // Instantly tell backend this message is read so opponent gets double mark immediately!
            markMessagesAsRead(parsed.sender, currentUser);
          }

          store.dispatch(addMessage(parsed));
        } catch (err) {
          console.error("Failed to parse message frame:", err);
        }
      });
      subscriptions.push(msgSub);

      // 2. Unread message count updates
      const unreadSub = stompClient.subscribe("/user/queue/unread", (msg) => {
        try {
          const unreadUpdate = JSON.parse(msg.body);
          if (unreadUpdate.type === "UNREAD_UPDATE") {
            const counts = { ...(unreadUpdate.unreadCounts || {}) };
            const activeReceiver = store.getState().chat.receiver;
            // Active chat must always show 0 unread
            if (activeReceiver) {
              counts[activeReceiver] = 0;
            }
            store.dispatch(setUnreadCounts(counts));
          }
        } catch (err) {
          console.error("Failed to parse unread frame:", err);
        }
      });
      subscriptions.push(unreadSub);

      // 3. WhatsApp-style Typing events
      const typingSub = stompClient.subscribe("/user/queue/typing", (msg) => {
        try {
          const typingData = JSON.parse(msg.body);
          store.dispatch(setTypingStatus(typingData));
        } catch (err) {
          console.error("Failed to parse typing frame:", err);
        }
      });
      subscriptions.push(typingSub);

      // 4. Real-time online users broadcast
      const onlineSub = stompClient.subscribe("/topic/online-users", (msg) => {
        try {
          const onlineList = JSON.parse(msg.body);
          store.dispatch(setOnlineUsers(onlineList));
        } catch (err) {
          console.error("Failed to parse online users frame:", err);
        }
      });
      subscriptions.push(onlineSub);

      // 5. User directory list updates
      const usersSub = stompClient.subscribe("/topic/users", () => {
        store.dispatch(fetchUsers(username));
      });
      subscriptions.push(usersSub);

      // 6. 🔥 FIX DOUBLE MARK: Real-time read receipt updates
      const readReceiptSub = stompClient.subscribe("/user/queue/read-receipts", (msg) => {
        try {
          const receipt = JSON.parse(msg.body);
          if (receipt.type === "READ_RECEIPT" || receipt.sender) {
            store.dispatch(markMessagesReadInStore(receipt));
          }
        } catch (err) {
          console.error("Failed to parse read receipt frame:", err);
        }
      });
      subscriptions.push(readReceiptSub);

      // 7. 🔥 REAL-TIME DELETE MESSAGE & MEDIA
      const deleteSub = stompClient.subscribe("/user/queue/messages/delete", (msg) => {
        try {
          const deleteData = JSON.parse(msg.body);
          if (deleteData.type === "MESSAGE_DELETED") {
            store.dispatch(deleteMessageInStore(deleteData));
          }
        } catch (err) {
          console.error("Failed to parse delete frame:", err);
        }
      });
      subscriptions.push(deleteSub);

      // 8. 🔥 REAL-TIME EMOJI REACTIONS
      const reactionSub = stompClient.subscribe("/user/queue/messages/reaction", (msg) => {
        try {
          const reactionData = JSON.parse(msg.body);
          if (reactionData.type === "MESSAGE_REACTION") {
            store.dispatch(updateMessageReactionInStore(reactionData));
          }
        } catch (err) {
          console.error("Failed to parse reaction frame:", err);
        }
      });
      subscriptions.push(reactionSub);

      // Send presence ping so server registers us online immediately
      if (stompClient.connected) {
        stompClient.send(
          "/app/presence",
          {},
          JSON.stringify({ username })
        );
      }

      // Initial data fetches
      store.dispatch(fetchUsers(username));
      fetchUnreadCounts(username);
      fetchInitialOnlineUsers();
    },
    (error) => {
      isConnecting = false;
      console.warn("WebSocket connection error:", error);
    }
  );
};

export const disconnectSocket = (username) => {
  const userToDisconnect = username || currentUsername;
  isConnecting = false;
  currentUsername = null;

  // Notify server of offline presence before tearing down
  if (stompClient && stompClient.connected && userToDisconnect) {
    try {
      stompClient.send(
        "/app/offline",
        {},
        JSON.stringify({ username: userToDisconnect })
      );
    } catch (e) {
      // ignore
    }
  }

  // Unsubscribe all active subscriptions
  subscriptions.forEach((sub) => {
    try {
      sub.unsubscribe();
    } catch (e) {
      // ignore
    }
  });
  subscriptions = [];

  if (stompClient) {
    try {
      if (stompClient.connected) {
        stompClient.disconnect();
      }
    } catch (e) {
      // ignore
    }
    stompClient = null;
  }
};

export const sendPrivateMessage = (sender, receiver, content, mediaData = null) => {
  if (stompClient && stompClient.connected) {
    const payload = {
      sender,
      receiver,
      content: content || "",
      messageType: mediaData?.fileType || "TEXT",
      mediaUrl: mediaData?.url || null,
      mediaName: mediaData?.fileName || null,
      mediaSize: mediaData?.size || null,
    };
    stompClient.send("/app/sendMessage", {}, JSON.stringify(payload));
  }
};

export const sendTypingStatus = (sender, receiver, isTyping) => {
  if (stompClient && stompClient.connected && sender && receiver) {
    stompClient.send(
      "/app/typing",
      {},
      JSON.stringify({ sender, receiver, typing: Boolean(isTyping) })
    );
  }
};

export const markMessagesAsRead = (sender, receiver) => {
  if (stompClient && stompClient.connected && sender && receiver) {
    stompClient.send(
      "/app/markAsRead",
      {},
      JSON.stringify({ sender, receiver })
    );
  }
};

export const sendDeleteMessage = (messageId, username, forEveryone = false, deleteMediaOnly = false) => {
  if (stompClient && stompClient.connected && messageId) {
    stompClient.send(
      "/app/deleteMessage",
      {},
      JSON.stringify({ messageId, username, forEveryone, deleteMediaOnly })
    );
  }
};

export const sendReaction = (messageId, username, emoji) => {
  if (stompClient && stompClient.connected && messageId && username) {
    stompClient.send(
      "/app/reactMessage",
      {},
      JSON.stringify({ messageId, username, emoji })
    );
  }
};

// Helper function to fetch initial unread counts
const fetchUnreadCounts = async (username) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:9090";
    const response = await fetch(`${apiUrl}/api/messages/unread-counts/${encodeURIComponent(username)}`);
    if (response.ok) {
      const unreadCounts = await response.json();
      const activeReceiver = store.getState().chat.receiver;
      if (activeReceiver) {
        unreadCounts[activeReceiver] = 0;
      }
      store.dispatch(setUnreadCounts(unreadCounts));
    }
  } catch (error) {
    console.error("Failed to fetch unread counts:", error);
  }
};

// Helper function to fetch initial online users
const fetchInitialOnlineUsers = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:9090";
    const response = await fetch(`${apiUrl}/api/users/online`);
    if (response.ok) {
      const onlineUsers = await response.json();
      store.dispatch(setOnlineUsers(onlineUsers));
    }
  } catch (error) {
    console.error("Failed to fetch online users:", error);
  }
};
