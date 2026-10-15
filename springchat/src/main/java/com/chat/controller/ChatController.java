package com.chat.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import com.chat.model.ChatMessage;
import com.chat.model.User;
import com.chat.repository.UserRepository;
import com.chat.service.ChatMessageService;
import com.chat.service.UserPresenceService;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatMessageService chatMessageService;

    @Autowired
    private UserPresenceService presenceService;

    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        // Save message to database
        ChatMessage savedMessage = chatMessageService.saveMessage(chatMessage);

        // Send to receiver
        messagingTemplate.convertAndSendToUser(
            chatMessage.getReceiver(), "/queue/messages", savedMessage
        );

        // Send back to sender for confirmation only if sender is not the same as receiver
        if (!chatMessage.getSender().equalsIgnoreCase(chatMessage.getReceiver())) {
            messagingTemplate.convertAndSendToUser(
                chatMessage.getSender(), "/queue/messages", savedMessage
            );
        }

        // Send unread count update to receiver
        sendUnreadCountUpdate(chatMessage.getReceiver());
    }

    // Typing status indicator (WhatsApp style)
    @MessageMapping("/typing")
    public void handleTyping(@Payload Map<String, Object> typingPayload) {
        String receiver = (String) typingPayload.get("receiver");
        if (receiver != null && !receiver.isBlank()) {
            messagingTemplate.convertAndSendToUser(
                receiver, "/queue/typing", typingPayload
            );
        }
    }

    // Online presence registration
    @MessageMapping("/presence")
    public void handlePresence(Principal principal,
                               @Payload(required = false) Map<String, Object> payload,
                               SimpMessageHeaderAccessor headerAccessor) {
        String username = (principal != null && !"anonymous".equalsIgnoreCase(principal.getName()))
                ? principal.getName() : null;
        if (username == null && payload != null) {
            username = (String) payload.get("username");
        }
        if (username != null && !username.isBlank()) {
            String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : "session-" + System.currentTimeMillis();
            presenceService.userConnected(username, sessionId);
            broadcastOnlineUsers();
            broadcastUserList();
        }
    }

    // Offline notification on signout / unmount
    @MessageMapping("/offline")
    public void handleOffline(Principal principal,
                              @Payload(required = false) Map<String, Object> payload,
                              SimpMessageHeaderAccessor headerAccessor) {
        String username = (principal != null && !"anonymous".equalsIgnoreCase(principal.getName()))
                ? principal.getName() : null;
        if (username == null && payload != null) {
            username = (String) payload.get("username");
        }
        String sessionId = headerAccessor != null ? headerAccessor.getSessionId() : null;
        if (username != null && !username.isBlank()) {
            presenceService.removeUser(username);
        } else if (sessionId != null) {
            presenceService.userDisconnected(null, sessionId);
        }
        broadcastOnlineUsers();
        broadcastUserList();
    }

    // Mark messages as read and push unread count updates
    @MessageMapping("/markAsRead")
    public void markAsRead(@Payload Map<String, String> readRequest) {
        String sender = readRequest.get("sender");
        String receiver = readRequest.get("receiver");
        
        if (sender != null && receiver != null) {
            // Mark messages as read in database
            chatMessageService.markMessagesAsRead(sender, receiver);
            
            // Send unread count updates to both users
            sendUnreadCountUpdate(receiver);
            sendUnreadCountUpdate(sender);
            
            // Send read receipt confirmation to the sender
            Map<String, String> readReceipt = new HashMap<>();
            readReceipt.put("type", "READ_RECEIPT");
            readReceipt.put("message", "Messages read by " + receiver);
            readReceipt.put("sender", sender);
            readReceipt.put("receiver", receiver);
            
            messagingTemplate.convertAndSendToUser(
                sender,
                "/queue/read-receipts",
                readReceipt
            );
        }
    }

    // Delete message (Delete for me, Delete for everyone, or Delete media only)
    @MessageMapping("/deleteMessage")
    public void handleDeleteMessage(@Payload Map<String, Object> payload) {
        try {
            Long messageId = Long.valueOf(payload.get("messageId").toString());
            String username = (String) payload.get("username");
            boolean forEveryone = payload.containsKey("forEveryone") && Boolean.parseBoolean(String.valueOf(payload.get("forEveryone")));
            boolean deleteMediaOnly = payload.containsKey("deleteMediaOnly") && Boolean.parseBoolean(String.valueOf(payload.get("deleteMediaOnly")));

            ChatMessage updated = chatMessageService.deleteMessage(messageId, username, forEveryone, deleteMediaOnly);
            if (updated != null) {
                Map<String, Object> deleteEvent = new HashMap<>();
                deleteEvent.put("type", "MESSAGE_DELETED");
                deleteEvent.put("messageId", messageId);
                deleteEvent.put("forEveryone", forEveryone);
                deleteEvent.put("deleteMediaOnly", deleteMediaOnly);
                deleteEvent.put("deletedBy", username);
                deleteEvent.put("updatedMessage", updated);

                messagingTemplate.convertAndSendToUser(updated.getReceiver(), "/queue/messages/delete", deleteEvent);
                messagingTemplate.convertAndSendToUser(updated.getSender(), "/queue/messages/delete", deleteEvent);
            }
        } catch (Exception e) {
            System.err.println("Error deleting message: " + e.getMessage());
        }
    }

    // Emoji reaction on message
    @MessageMapping("/reactMessage")
    public void handleReactMessage(@Payload Map<String, Object> payload) {
        try {
            Long messageId = Long.valueOf(payload.get("messageId").toString());
            String username = (String) payload.get("username");
            String emoji = (String) payload.get("emoji");

            ChatMessage updated = chatMessageService.addOrToggleReaction(messageId, username, emoji);
            if (updated != null) {
                Map<String, Object> reactionEvent = new HashMap<>();
                reactionEvent.put("type", "MESSAGE_REACTION");
                reactionEvent.put("messageId", messageId);
                reactionEvent.put("reactions", updated.getReactions());

                messagingTemplate.convertAndSendToUser(updated.getReceiver(), "/queue/messages/reaction", reactionEvent);
                messagingTemplate.convertAndSendToUser(updated.getSender(), "/queue/messages/reaction", reactionEvent);
            }
        } catch (Exception e) {
            System.err.println("Error handling message reaction: " + e.getMessage());
        }
    }

    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = extractUsername(accessor);
        String sessionId = accessor.getSessionId();
        if (username != null) {
            presenceService.userConnected(username, sessionId);
        }
        broadcastOnlineUsers();
        broadcastUserList();
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = extractUsername(accessor);
        String sessionId = accessor.getSessionId();
        presenceService.userDisconnected(username, sessionId);
        broadcastOnlineUsers();
        broadcastUserList();
    }

    private String extractUsername(StompHeaderAccessor accessor) {
        if (accessor.getUser() != null && accessor.getUser().getName() != null
                && !"anonymous".equalsIgnoreCase(accessor.getUser().getName())) {
            return accessor.getUser().getName();
        }
        if (accessor.getSessionAttributes() != null) {
            Object userAttr = accessor.getSessionAttributes().get("username");
            if (userAttr != null) {
                return userAttr.toString();
            }
        }
        return null;
    }

    public void broadcastUserList() {
        List<User> allUsers = userRepository.findAll();
        for (User u : allUsers) {
            u.setOnline(presenceService.isUserOnline(u.getUsername()));
        }
        messagingTemplate.convertAndSend("/topic/users", allUsers);
    }

    public void broadcastOnlineUsers() {
        messagingTemplate.convertAndSend("/topic/online-users", presenceService.getOnlineUsers());
    }

    // Helper method to send unread count updates
    private void sendUnreadCountUpdate(String username) {
        try {
            Map<String, Integer> unreadCounts = chatMessageService.getUnreadCountsPerSender(username);
            Map<String, Object> countUpdate = new HashMap<>();
            countUpdate.put("type", "UNREAD_UPDATE");
            countUpdate.put("unreadCounts", unreadCounts);
            
            messagingTemplate.convertAndSendToUser(
                username, 
                "/queue/unread", 
                countUpdate
            );
        } catch (Exception e) {
            System.err.println("Error sending unread count update for user: " + username);
            e.printStackTrace();
        }
    }
}