package com.chat.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Profile("prod")
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    private static final String DEFAULT_PUBLIC_URL = "postgresql://postgres:NzsUamlrMQEycaUibWdfjnqJdYPISCuE@iriguchi.proxy.rlwy.net:46269/railway";
    private static final String DEFAULT_HOST = "iriguchi.proxy.rlwy.net";
    private static final String DEFAULT_PORT = "46269";
    private static final String DEFAULT_DATABASE = "railway";
    private static final String DEFAULT_USER = "postgres";
    private static final String DEFAULT_PASSWORD = "NzsUamlrMQEycaUibWdfjnqJdYPISCuE";

    @Value("${DATABASE_PUBLIC_URL:}")
    private String databasePublicUrl;

    @Value("${SPRING_DATASOURCE_URL:}")
    private String springDatasourceUrl;

    @Value("${DATABASE_URL:postgresql://postgres:NzsUamlrMQEycaUibWdfjnqJdYPISCuE@iriguchi.proxy.rlwy.net:46269/railway}")
    private String databaseUrl;

    @Value("${DATABASE_PRIVATE_URL:}")
    private String databasePrivateUrl;

    @Value("${POSTGRES_URL:}")
    private String postgresUrl;

    @Value("${PGHOST:${PG_HOST:iriguchi.proxy.rlwy.net}}")
    private String pgHost;

    @Value("${PGPORT:${PG_PORT:46269}}")
    private String pgPort;

    @Value("${PGDATABASE:${PG_DATABASE:railway}}")
    private String pgDatabase;

    @Value("${PGUSER:${PG_USER:postgres}}")
    private String pgUser;

    @Value("${PGPASSWORD:${PG_PASSWORD:NzsUamlrMQEycaUibWdfjnqJdYPISCuE}}")
    private String pgPassword;

    private String pickFirstNonEmpty(String... candidates) {
        for (String c : candidates) {
            if (c != null && !c.isBlank() && !c.startsWith("${{")) {
                return c.trim();
            }
        }
        return null;
    }

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setDriverClassName("org.postgresql.Driver");

        // Prioritize candidate URLs, defaulting to verified public endpoint
        String chosenUrl = pickFirstNonEmpty(
            databasePublicUrl,
            springDatasourceUrl,
            databaseUrl,
            databasePrivateUrl,
            postgresUrl,
            DEFAULT_PUBLIC_URL
        );

        if (chosenUrl != null) {
            log.info("DataSourceConfig: Using connection string.");
            try {
                String cleanUrl = chosenUrl.startsWith("jdbc:") ? chosenUrl.substring(5) : chosenUrl;
                URI uri = new URI(cleanUrl);
                String userInfo = uri.getUserInfo();
                String username = (pgUser != null && !pgUser.isBlank()) ? pgUser : DEFAULT_USER;
                String password = (pgPassword != null && !pgPassword.isBlank()) ? pgPassword : DEFAULT_PASSWORD;
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = parts[0];
                    password = parts[1];
                }
                int port = uri.getPort() == -1 ? Integer.parseInt(DEFAULT_PORT) : uri.getPort();
                String host = uri.getHost() != null ? uri.getHost() : DEFAULT_HOST;
                String path = uri.getPath() != null && !uri.getPath().isBlank() ? uri.getPath() : "/" + DEFAULT_DATABASE;
                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;

                log.info("DataSourceConfig: Connecting to PostgreSQL at {}:{}", host, port);
                config.setJdbcUrl(jdbcUrl);
                config.setUsername(username);
                config.setPassword(password);
            } catch (Exception e) {
                log.warn("DataSourceConfig: URI parsing fallback ({}). Using raw URL.", e.getMessage());
                String jdbcUrl = chosenUrl.startsWith("jdbc:") ? chosenUrl : "jdbc:" + chosenUrl;
                config.setJdbcUrl(jdbcUrl);
                config.setUsername((pgUser != null && !pgUser.isBlank()) ? pgUser : DEFAULT_USER);
                config.setPassword((pgPassword != null && !pgPassword.isBlank()) ? pgPassword : DEFAULT_PASSWORD);
            }
        } else {
            String host = (pgHost != null && !pgHost.isBlank() && !pgHost.startsWith("${{")) ? pgHost.trim() : DEFAULT_HOST;
            String port = (pgPort != null && !pgPort.isBlank()) ? pgPort.trim() : DEFAULT_PORT;
            String database = (pgDatabase != null && !pgDatabase.isBlank()) ? pgDatabase.trim() : DEFAULT_DATABASE;
            String username = (pgUser != null && !pgUser.isBlank()) ? pgUser.trim() : DEFAULT_USER;
            String password = (pgPassword != null && !pgPassword.isBlank()) ? pgPassword.trim() : DEFAULT_PASSWORD;

            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database;
            log.info("DataSourceConfig: Connecting to PostgreSQL at {}:{}", host, port);
            config.setJdbcUrl(jdbcUrl);
            config.setUsername(username);
            config.setPassword(password);
        }

        // Production connection pool tuning
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);

        return new HikariDataSource(config);
    }
}
