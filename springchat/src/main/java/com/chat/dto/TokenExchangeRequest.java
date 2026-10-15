// TokenExchangeRequest.java
package com.chat.dto;

public class TokenExchangeRequest {
    private String token;
    
    // Default constructor
    public TokenExchangeRequest() {}
    
    public TokenExchangeRequest(String token) {
        this.token = token;
    }
    
    // Getters and setters
    public String getToken() {
        return token;
    }
    
    public void setToken(String token) {
        this.token = token;
    }
}