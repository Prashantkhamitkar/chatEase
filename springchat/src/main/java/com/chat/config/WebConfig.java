package com.chat.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @org.springframework.beans.factory.annotation.Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                String cleanUrl = (frontendUrl != null && frontendUrl.endsWith("/"))
                        ? frontendUrl.substring(0, frontendUrl.length() - 1)
                        : (frontendUrl != null ? frontendUrl : "http://localhost:5173");

                registry.addMapping("/**")
                        .allowedOriginPatterns(
                            cleanUrl,
                            "http://localhost:5173",
                            "http://localhost:3000",
                            "https://*.up.railway.app",
                            "https://*.railway.app",
                            "https://*.netlify.app"
                        )
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}