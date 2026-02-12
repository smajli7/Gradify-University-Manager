package de.gradify.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.util.Timeout;
import org.junit.jupiter.api.BeforeAll;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Map;

/**
 * Basis fuer E2E-Tests.
 * <p>
 * Erwartet, dass alle Services bereits laufen (z.B. via docker-compose.test.yml).
 * Die Tests werden gegen das API-Gateway (Port 18080) ausgefuehrt.
 * </p>
 * <p>
 * Start der Services vor E2E-Tests:
 * <pre>
 * docker compose -f gradify-e2e-tests/src/test/resources/docker-compose.test.yml up -d --build
 * mvn verify -Pe2e -pl gradify-e2e-tests
 * </pre>
 * </p>
 */
public abstract class BaseE2ETest {

    protected static final Logger log = LoggerFactory.getLogger(BaseE2ETest.class);

    /** Base-URL des API-Gateways (Test-Instanz). */
    protected static final String GATEWAY_URL = System.getProperty("e2e.gateway.url",
            "http://localhost:18080");

    /** Direkte Service-URLs fuer Health-Checks. */
    protected static final String AUTH_URL = System.getProperty("e2e.auth.url",
            "http://localhost:18081");
    protected static final String USER_URL = System.getProperty("e2e.user.url",
            "http://localhost:18082");

    protected static RestTemplate restTemplate;
    protected static ObjectMapper objectMapper;

    @BeforeAll
    static void setupRestClient() {
        RequestConfig requestConfig = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(5))
                .setResponseTimeout(Timeout.ofSeconds(10))
                .build();

        CloseableHttpClient httpClient = HttpClients.custom()
                .setDefaultRequestConfig(requestConfig)
                .build();

        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        restTemplate = new RestTemplate(factory);

        // For E2E we want to assert on HTTP status codes (401/403/400 etc.) without exceptions.
        restTemplate.setErrorHandler(new DefaultResponseErrorHandler() {
            @Override
            public boolean hasError(ClientHttpResponse response) throws IOException {
                return false;
            }
        });
        objectMapper = new ObjectMapper();
    }

    // ===== Hilfsmethoden =====

    /**
     * Loggt sich ein und gibt den Access-Token zurueck.
     */
    protected String login(String username, String password) {
        Map<String, String> loginRequest = Map.of(
                "username", username,
                "password", password
        );

        ResponseEntity<Map> response = restTemplate.postForEntity(
                GATEWAY_URL + "/api/auth/login", loginRequest, Map.class);

        if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
            throw new RuntimeException("Login fehlgeschlagen fuer " + username
                    + ": " + response.getStatusCode());
        }

        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        return (String) data.get("accessToken");
    }

    /**
     * Erstellt HTTP-Headers mit Bearer-Token.
     */
    protected HttpHeaders bearerHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    /**
     * Erstellt ein HttpEntity mit Auth-Headers und Body.
     */
    protected <T> HttpEntity<T> authEntity(String token, T body) {
        return new HttpEntity<>(body, bearerHeaders(token));
    }

    /**
     * Erstellt ein HttpEntity mit nur Auth-Headers (ohne Body).
     */
    protected HttpEntity<?> authEntity(String token) {
        return new HttpEntity<>(bearerHeaders(token));
    }

    /**
     * Wartet bis ein Service auf einem Actuator-Endpoint antwortet.
     */
    protected static void waitForService(String baseUrl, String name, int maxSeconds) {
        log.info("Warte auf {} ({})...", name, baseUrl);
        long start = System.currentTimeMillis();
        RestTemplate probe = new RestTemplate();
        while (System.currentTimeMillis() - start < maxSeconds * 1000L) {
            try {
                ResponseEntity<String> resp = probe.getForEntity(
                        baseUrl + "/actuator/health", String.class);
                if (resp.getStatusCode().is2xxSuccessful()) {
                    log.info("{} ist bereit ({}ms)", name,
                            System.currentTimeMillis() - start);
                    return;
                }
            } catch (Exception ignored) {
                // Service noch nicht bereit
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        log.warn("{} nicht erreichbar nach {}s", name, maxSeconds);
    }
}
