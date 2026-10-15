package com.chat.controller;

import com.chat.dto.LoginRequest;
import com.chat.dto.RegisterRequest;
import com.chat.dto.TokenExchangeRequest;
import com.chat.model.AuthProvider;
import com.chat.model.User;
import com.chat.repository.UserRepository;
import com.chat.security.JwtUtil;
import com.chat.service.ShortLivedTokenService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.chat.service.UserPresenceService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private ShortLivedTokenService shortLivedTokenService;

    @Autowired
    private UserPresenceService presenceService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    // Authentication check endpoint
    @GetMapping("/check")
    public ResponseEntity<?> checkAuth(HttpServletRequest request, HttpServletResponse response) {
        String token = extractTokenFromCookie(request);
        
        if (token == null || !jwtUtil.validateToken(token)) {
            clearJwtCookie(response);
            return ResponseEntity.status(401).body(
                Map.of("authenticated", false, "message", "Not authenticated")
            );
        }
        
        try {
            String username = jwtUtil.extractUsername(token);
            Optional<User> userOpt = userRepository.findByUsername(username);
            
            if (userOpt.isEmpty()) {
                clearJwtCookie(response);
                return ResponseEntity.status(401).body(
                    Map.of("authenticated", false, "message", "User not found")
                );
            }
            
            User user = userOpt.get();
            
            // Prepare user data for frontend
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("email", user.getEmail());
            userData.put("fullName", user.getFullName());
            userData.put("profilePicture", user.getProfilePicture());
            userData.put("provider", user.getProvider().name());
            
            Map<String, Object> authResponse = new HashMap<>();
            authResponse.put("authenticated", true);
            authResponse.put("user", userData);
            System.out.println(userData.get("email"));
            return ResponseEntity.ok(authResponse);
            
        } catch (Exception e) {
            clearJwtCookie(response);
            return ResponseEntity.status(401).body(
                Map.of("authenticated", false, "message", "Invalid token")
            );
        }
    }
    @PostMapping("/exchange-token")
    public ResponseEntity<?> exchangeToken(
            @RequestBody TokenExchangeRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse response) {
        
        System.out.println("=== TOKEN EXCHANGE ENDPOINT CALLED ===");
        System.out.println("Received token: " + request.getToken());
        
        if (request.getToken() == null || request.getToken().trim().isEmpty()) {
            System.err.println("Token is null or empty");
            return ResponseEntity.badRequest().body(
                Map.of("authenticated", false, "message", "Token is required")
            );
        }
        
        // Validate short-lived token
        String username = shortLivedTokenService.validateAndGetUsername(request.getToken());
        
        if (username == null) {
            System.err.println("Invalid or expired token");
            return ResponseEntity.status(401).body(
                Map.of("authenticated", false, "message", "Invalid or expired token")
            );
        }
        
        System.out.println("Token validated for user: " + username);
        
        // Get user details
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            System.err.println("User not found for username: " + username);
            return ResponseEntity.status(401).body(
                Map.of("authenticated", false, "message", "User not found")
            );
        }
        
        User user = userOpt.get();
        
        // Generate proper JWT token
        String jwtToken = jwtUtil.generateToken(username);
        System.out.println("JWT Token generated for: " + username);
        
        // Set JWT as HTTP-only cookie
        setJwtCookie(response, jwtToken);
        
        // Prepare user data for frontend (same format as /check endpoint)
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("username", user.getUsername());
        userData.put("email", user.getEmail());
        userData.put("fullName", user.getFullName());
        userData.put("profilePicture", user.getProfilePicture());
        userData.put("provider", user.getProvider().name());
        
        Map<String, Object> authResponse = new HashMap<>();
        authResponse.put("authenticated", true);
        authResponse.put("user", userData);
        
        System.out.println("User email: " + userData.get("email"));
        System.out.println("Token exchange completed successfully for: " + username);
        
        return ResponseEntity.ok(authResponse);
    }
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        // Check if username exists
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Username already exists")
            );
        }
        
        // Check if email exists
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Email already exists")
            );
        }
        
        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setProvider(AuthProvider.LOCAL);
        user.setLastLogin(LocalDateTime.now());
        
        userRepository.save(user);
        
        // Generate JWT token
        String token = jwtUtil.generateToken(user.getUsername());
        
        // Set HTTP-only cookie
        setJwtCookie(response, token);
        
        // Prepare response for frontend
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("username", user.getUsername());
        userData.put("email", user.getEmail());
        userData.put("fullName", user.getFullName());
        userData.put("provider", user.getProvider().name());
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("message", "Registration successful");
        responseBody.put("user", userData);
        
        return ResponseEntity.ok(responseBody);
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        
        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            return ResponseEntity.badRequest().body(
                Map.of("success", false, "message", "Invalid credentials")
            );
        }
        
        User user = userOpt.get();
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        
        // Generate JWT token
        String token = jwtUtil.generateToken(user.getUsername());
        
        // Set HTTP-only cookie
        setJwtCookie(response, token);
        
        // Prepare response for frontend
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("username", user.getUsername());
        userData.put("email", user.getEmail());
        userData.put("fullName", user.getFullName());
        userData.put("profilePicture", user.getProfilePicture());
        userData.put("provider", user.getProvider().name());
        
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("success", true);
        responseBody.put("message", "Login successful");
        responseBody.put("user", userData);
        
        return ResponseEntity.ok(responseBody);
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) Map<String, String> body,
                                    HttpServletRequest request,
                                    HttpServletResponse response) {
        String username = null;
        if (body != null && body.containsKey("username")) {
            username = body.get("username");
        }
        if (username == null || username.isBlank()) {
            String token = extractTokenFromCookie(request);
            if (token != null && jwtUtil.validateToken(token)) {
                try {
                    username = jwtUtil.extractUsername(token);
                } catch (Exception ignored) {}
            }
        }
        if (username != null && presenceService != null) {
            presenceService.removeUser(username);
            if (messagingTemplate != null) {
                messagingTemplate.convertAndSend("/topic/online-users", presenceService.getOnlineUsers());
            }
        }
        clearJwtCookie(response);
        
        return ResponseEntity.ok(
            Map.of("success", true, "message", "Logout successful")
        );
    }
 // Add to your AuthController
    @GetMapping("/debug/cookies")
    public ResponseEntity<?> debugCookies(HttpServletRequest request) {
        Map<String, Object> debugInfo = new HashMap<>();
        
        // Request info
        debugInfo.put("requestURL", request.getRequestURL().toString());
        debugInfo.put("method", request.getMethod());
        debugInfo.put("userAgent", request.getHeader("User-Agent"));
        debugInfo.put("origin", request.getHeader("Origin"));
        
        // Cookies
        List<Map<String, String>> cookies = new ArrayList();
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                Map<String, String> cookieInfo = new HashMap<>();
                cookieInfo.put("name", cookie.getName());
                cookieInfo.put("value", cookie.getValue() != null ? "PRESENT" : "NULL");
                cookieInfo.put("domain", cookie.getDomain());
                cookieInfo.put("path", cookie.getPath());
                cookieInfo.put("secure", String.valueOf(cookie.getSecure()));
                cookies.add(cookieInfo);
            }
        }
        debugInfo.put("cookies", cookies);
        
        // Headers
        Map<String, String> headers = new HashMap<>();
        java.util.Collections.list(request.getHeaderNames())
            .forEach(header -> headers.put(header, request.getHeader(header)));
        debugInfo.put("headers", headers);
        
        return ResponseEntity.ok(debugInfo);
    }
   // In CustomOAuth2SuccessHandler - use the SAME method
private void setJwtCookie(HttpServletResponse response, String token) {
    String cookieHeader = String.format(
        "jwt=%s; HttpOnly; Secure; Path=/; Max-Age=%d; SameSite=None; Partitioned", 
        token, 
        7 * 24 * 60 * 60
    );
    
    response.addHeader("Set-Cookie", cookieHeader);
    System.out.println("✅ OAuth JWT Cookie set successfully");
}
    
    private void clearJwtCookie(HttpServletResponse response) {
        // Clear cookie using header approach for cross-domain
        String cookieHeader = "jwt=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=None";
        
        // Add Partitioned attribute if needed
        cookieHeader += "; Partitioned";
        
        response.addHeader("Set-Cookie", cookieHeader);
    }
    
    private String extractTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("jwt".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
    
    
}