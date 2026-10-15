package com.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;

import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
	  private final UserHandshakeInterceptor handshakeInterceptor;
	    private final CustomHandshakeHandler handshakeHandler;

	    public WebSocketConfig(UserHandshakeInterceptor handshakeInterceptor, CustomHandshakeHandler handshakeHandler) {
			super();
			this.handshakeInterceptor = handshakeInterceptor;
			this.handshakeHandler = handshakeHandler;
		}

	    @Override
	    public void registerStompEndpoints(StompEndpointRegistry registry) {
	        registry.addEndpoint("/ws")
	                .addInterceptors(handshakeInterceptor)
	                .setHandshakeHandler(handshakeHandler)
	                .setAllowedOriginPatterns("*")
	                .withSockJS();
	    }

	    @Override
	    public void configureMessageBroker(MessageBrokerRegistry registry) {
	        registry.enableSimpleBroker("/queue", "/topic");
	        registry.setApplicationDestinationPrefixes("/app");
	        registry.setUserDestinationPrefix("/user");
	    }
}
