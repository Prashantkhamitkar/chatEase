package com.chat.service;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class UserPresenceService {

    // Map lowercase username -> Set of active session IDs
    private final Map<String, Set<String>> userSessions = new ConcurrentHashMap<>();

    public synchronized void userConnected(String username, String sessionId) {
        if (username == null || username.isBlank() || "anonymous".equalsIgnoreCase(username)) {
            return;
        }
        String key = username.trim().toLowerCase();
        userSessions.computeIfAbsent(key, k -> ConcurrentHashMap.newKeySet())
                    .add(sessionId != null ? sessionId : "default");
    }

    public synchronized void userDisconnected(String username, String sessionId) {
        if (username != null && !username.isBlank()) {
            String key = username.trim().toLowerCase();
            Set<String> sessions = userSessions.get(key);
            if (sessions != null) {
                if (sessionId != null) {
                    sessions.remove(sessionId);
                }
                // Clean up any ping markers if real sessions disconnected
                sessions.removeIf(s -> s.startsWith("client-ping") || s.equals("default"));
                if (sessions.isEmpty() || sessionId == null) {
                    userSessions.remove(key);
                }
            }
        }

        if (sessionId != null) {
            // Scrub this sessionId across all user entries
            for (Map.Entry<String, Set<String>> entry : userSessions.entrySet()) {
                if (entry.getValue().remove(sessionId)) {
                    entry.getValue().removeIf(s -> s.startsWith("client-ping") || s.equals("default"));
                    if (entry.getValue().isEmpty()) {
                        userSessions.remove(entry.getKey());
                    }
                    break;
                }
            }
        }
    }

    public synchronized void removeUser(String username) {
        if (username != null && !username.isBlank()) {
            userSessions.remove(username.trim().toLowerCase());
        }
    }

    public boolean isUserOnline(String username) {
        if (username == null) return false;
        Set<String> sessions = userSessions.get(username.trim().toLowerCase());
        return sessions != null && !sessions.isEmpty();
    }

    public Set<String> getOnlineUsers() {
        return Collections.unmodifiableSet(userSessions.keySet());
    }
}
