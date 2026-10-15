package com.chat.security;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.chat.model.AuthProvider;
import com.chat.model.User;
import com.chat.repository.UserRepository;
import com.chat.service.ShortLivedTokenService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class CustomOAuth2SuccessHandler implements AuthenticationSuccessHandler {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private ShortLivedTokenService shortLivedTokenService; // We'll create this

    @org.springframework.beans.factory.annotation.Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private String getCleanFrontendUrl() {
        if (frontendUrl == null || frontendUrl.isBlank()) {
            return "http://localhost:5173";
        }
        return frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                      Authentication authentication) throws IOException {
        
        System.out.println("=== CUSTOM OAUTH2 SUCCESS HANDLER ===");
        String cleanUrl = getCleanFrontendUrl();
        
        if (authentication == null) {
            System.err.println("Authentication is NULL");
            response.sendRedirect(cleanUrl + "/auth?error=auth_null");
            return;
        }
        
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        
        if (oauth2User == null) {
            System.err.println("OAuth2User is NULL in authentication");
            response.sendRedirect(cleanUrl + "/auth?error=oauth_user_null");
            return;
        }
        
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String picture = oauth2User.getAttribute("picture");
        String googleId = oauth2User.getAttribute("sub");
        
        System.out.println("Processing user - Email: " + email + ", Name: " + name);
        
        if (email == null) {
            response.sendRedirect(cleanUrl + "/auth?error=email_null");
            return;
        }
        
        // Find or create user
        Optional<User> userOpt = userRepository.findByEmail(email);
        User user;
        
        if (userOpt.isPresent()) {
            user = userOpt.get();
            user.setLastLogin(LocalDateTime.now());
            System.out.println("Existing user found: " + user.getUsername());
        } else {
            user = new User();
            String username = generateUsername(email, name);
            user.setUsername(username);
            user.setEmail(email);
            user.setFullName(name);
            user.setProfilePicture(picture);
            user.setProvider(AuthProvider.GOOGLE);
            user.setProviderId(googleId);
            user.setLastLogin(LocalDateTime.now());
            System.out.println("New Google user created: " + username);
        }
        
        user = userRepository.save(user);
        
        // Generate short-lived token instead of JWT
        String shortLivedToken = shortLivedTokenService.generateToken(user.getUsername());
        System.out.println("Short-lived token generated for: " + user.getUsername());
        
        // Redirect with short-lived token as parameter to frontend callback
        String callbackUrl = cleanUrl + "/oauth/callback?token=" + shortLivedToken;
        System.out.println("Redirecting to: " + callbackUrl);
        response.sendRedirect(callbackUrl);
    }
    
    private String generateUsername(String email, String name) {
        String baseUsername = name != null ? 
            name.replaceAll("\\s+", "").toLowerCase() : 
            email.split("@")[0];
        
        String username = baseUsername;
        int counter = 1;
        
        while (userRepository.findByUsername(username).isPresent()) {
            username = baseUsername + counter;
            counter++;
        }
        
        return username;
    }
}