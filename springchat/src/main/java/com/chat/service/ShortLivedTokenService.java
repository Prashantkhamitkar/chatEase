// ShortLivedTokenService.java
package com.chat.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.UUID;

@Service
public class ShortLivedTokenService {
    
    private final Map<String, TokenData> tokenStore = new ConcurrentHashMap<>();
    private static final long TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
    
    public String generateToken(String username) {
        String token = UUID.randomUUID().toString();
        TokenData tokenData = new TokenData(username, System.currentTimeMillis());
        tokenStore.put(token, tokenData);
        
        // Cleanup expired tokens
        cleanupExpiredTokens();
        
        return token;
    }
    
    public String validateAndGetUsername(String token) {
        TokenData tokenData = tokenStore.get(token);
        
        if (tokenData == null) {
            return null;
        }
        
        if (System.currentTimeMillis() - tokenData.getCreatedAt() > TOKEN_EXPIRY_MS) {
            tokenStore.remove(token);
            return null;
        }
        
        // Remove token after use (one-time use)
        tokenStore.remove(token);
        return tokenData.getUsername();
    }
    
    private void cleanupExpiredTokens() {
        long currentTime = System.currentTimeMillis();
        tokenStore.entrySet().removeIf(entry -> 
            currentTime - entry.getValue().getCreatedAt() > TOKEN_EXPIRY_MS
        );
    }
    
    private static class TokenData {
        private final String username;
        private final long createdAt;
        
        public TokenData(String username, long createdAt) {
            this.username = username;
            this.createdAt = createdAt;
        }
        
        public String getUsername() { return username; }
        public long getCreatedAt() { return createdAt; }
    }
}