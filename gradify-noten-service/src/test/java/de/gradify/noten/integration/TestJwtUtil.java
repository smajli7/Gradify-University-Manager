package de.gradify.noten.integration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;

/**
 * Erzeugt gueltige JWT-Tokens fuer Integrationstests.
 * Verwendet HMAC-SHA256 mit dem gleichen Secret wie die application-integration-test.yml.
 */
final class TestJwtUtil {

    private static final String TEST_SECRET = "test-secret-key-for-integration-tests-only-1234567890";

    private TestJwtUtil() {}

    static String generateToken(Long userId, String... roles) {
        return generateToken(userId, null, roles);
    }

    static String generateToken(Long userId, Long mandantId, String... roles) {
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";

        StringBuilder rolesJson = new StringBuilder("[");
        for (int i = 0; i < roles.length; i++) {
            if (i > 0) rolesJson.append(",");
            rolesJson.append("\"").append(roles[i]).append("\"");
        }
        rolesJson.append("]");

        long exp = System.currentTimeMillis() / 1000 + 3600;
        StringBuilder payload = new StringBuilder("{");
        payload.append("\"sub\":\"").append(userId).append("\",");
        payload.append("\"roles\":").append(rolesJson).append(",");
        payload.append("\"name\":\"Test User\",");
        if (mandantId != null) {
            payload.append("\"mandantId\":").append(mandantId).append(",");
        }
        payload.append("\"exp\":").append(exp);
        payload.append("}");

        String headerB64 = base64UrlEncode(header.getBytes(StandardCharsets.UTF_8));
        String payloadB64 = base64UrlEncode(payload.toString().getBytes(StandardCharsets.UTF_8));
        String signature = sign(headerB64 + "." + payloadB64);

        return headerB64 + "." + payloadB64 + "." + signature;
    }

    private static String sign(String input) {
        try {
            byte[] secretBytes = Arrays.copyOf(
                    TEST_SECRET.getBytes(StandardCharsets.UTF_8), 32);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
            return base64UrlEncode(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException("Token signing failed", e);
        }
    }

    private static String base64UrlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}
