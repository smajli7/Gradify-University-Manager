package de.gradify.user.integration;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
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
 * Basis fuer User-Service Integrationstests.
 * Startet einen echten PostgreSQL-Container via Testcontainers.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("integration-test")
public abstract class AbstractIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("gradify_user_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");

        // Integration-Tests laufen gegen EIN Testcontainers-Postgres-DB (kein DB-per-Tenant).
        registry.add("gradify.tenant-provisioning.enabled", () -> "false");
        registry.add("gradify.tenant-routing.enabled", () -> "false");
        registry.add("gradify.tenant-registry.enabled", () -> "false");
    }

    @Autowired
    protected TestRestTemplate restTemplate;

    @BeforeAll
    static void disableJdkAuthenticator() {
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
        SimpleClientHttpRequestFactory base = new SimpleClientHttpRequestFactory();
        base.setConnectTimeout(5000);
        base.setReadTimeout(10000);
        base.setOutputStreaming(false);
        rt.setRequestFactory(new BufferingClientHttpRequestFactory(base));
    }

    /**
     * Erzeugt HTTP-Headers mit gueltigem JWT-Token (ADMIN-Rolle).
     */
    protected HttpHeaders authHeaders(String... roles) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(TestJwtUtil.generateToken(1L, 1L, roles));
        return headers;
    }

    /**
     * Erzeugt ein HttpEntity mit Auth-Headers und Body.
     */
    protected <T> HttpEntity<T> authEntity(T body, String... roles) {
        return new HttpEntity<>(body, authHeaders(roles));
    }
}
