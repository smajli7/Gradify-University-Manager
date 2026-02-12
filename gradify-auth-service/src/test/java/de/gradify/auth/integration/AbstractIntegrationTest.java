package de.gradify.auth.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.Authenticator;
import java.net.PasswordAuthentication;

/**
 * Basis fuer Auth-Service Integrationstests.
 * Startet einen echten PostgreSQL-Container via Testcontainers.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("integration-test")
public abstract class AbstractIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("gradify_auth_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @Autowired
    protected TestRestTemplate restTemplate;

    @BeforeAll
    static void disableJdkAuthenticator() {
        // Prevent JDK HttpURLConnection from auto-auth retry on 401 which can crash
        // with: "cannot retry due to server authentication, in streaming mode"
        Authenticator.setDefault(new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return null;
            }
        });
    }

    @BeforeEach
    void makeRequestsRepeatable() {
        var rt = restTemplate.getRestTemplate();
        // Important on Windows/JDK HttpURLConnection:
        // without buffering, a 401 response can trigger HttpRetryException
        // ("cannot retry due to server authentication, in streaming mode").
        SimpleClientHttpRequestFactory base = new SimpleClientHttpRequestFactory();
        base.setConnectTimeout(5000);
        base.setReadTimeout(10000);
        // Disable HttpURLConnection streaming mode to avoid:
        // java.net.HttpRetryException: cannot retry due to server authentication, in streaming mode
        base.setOutputStreaming(false);
        rt.setRequestFactory(new BufferingClientHttpRequestFactory(base));
    }
}
