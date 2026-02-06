package de.gradify.shared.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parser fuer Gradify Access-Tokens (Standard JWT with HMAC-SHA256).
 * Format: {header}.{payload}.{signature}
 *
 * Unterstuetzt sowohl das alte Format (gradify.header.payload.signature, 4 Teile)
 * als auch das neue Standard-JWT-Format (header.payload.signature, 3 Teile).
 *
 * Signature wird mit HMAC-SHA256 verifiziert wenn ein Secret konfiguriert ist.
 */
public final class GradifyTokenParser {

    private static final Pattern SUB_PATTERN = Pattern.compile("\"sub\":\"([^\"]+)\"");
    private static final Pattern ROLES_PATTERN = Pattern.compile("\"roles\":\\[([^\\]]*)\\]");
    private static final Pattern EXP_PATTERN = Pattern.compile("\"exp\":(\\d+)");
    private static final Pattern MANDANT_ID_PATTERN = Pattern.compile("\"mandantId\":(\\d+)");

    /** Configured JWT secret for signature verification. Null = skip verification. */
    private static volatile byte[] jwtSecretBytes;

    private GradifyTokenParser() {}

    /**
     * Konfiguriert das JWT-Secret fuer Signatur-Verifikation.
     * Muss einmal beim Service-Start aufgerufen werden.
     * @param secret Das JWT-Secret (min. 32 Bytes fuer HMAC-SHA256)
     */
    public static void configureSecret(String secret) {
        if (secret != null && !secret.isBlank()) {
            byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
            // Immer exakt 32 Bytes (256 bit) fuer HMAC-SHA256 – konsistent mit AuthService
            if (bytes.length < 32) {
                bytes = Arrays.copyOf(bytes, 32);
            } else if (bytes.length > 32) {
                bytes = Arrays.copyOf(bytes, 32);
            }
            jwtSecretBytes = bytes;
        }
    }

    /**
     * Parst und validiert den Token. Verifiziert Signatur, prueft Ablauf, extrahiert User-ID und Rollen.
     * @return ParsedToken mit userId und Rollen, oder null wenn ungueltig
     */
    public static ParsedToken parseAndValidate(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            String[] parts = token.split("\\.");
            String headerB64;
            String payloadB64;
            String signatureB64;

            if (parts.length == 3) {
                // Standard JWT: header.payload.signature
                headerB64 = parts[0];
                payloadB64 = parts[1];
                signatureB64 = parts[2];
            } else if (parts.length == 4 && "gradify".equals(parts[0])) {
                // Legacy format: gradify.header.payload.signature
                headerB64 = parts[1];
                payloadB64 = parts[2];
                signatureB64 = parts[3];
            } else {
                return null;
            }

            // Signatur verifizieren (wenn Secret konfiguriert und Standard-JWT)
            if (jwtSecretBytes != null && parts.length == 3) {
                if (!verifySignature(headerB64, payloadB64, signatureB64)) {
                    return null;
                }
            }

            // Payload dekodieren: URL-safe Base64 fuer Standard-JWT, Standard-Base64 fuer Legacy
            String payloadJson;
            try {
                payloadJson = new String(Base64.getUrlDecoder().decode(padBase64(payloadB64)));
            } catch (IllegalArgumentException e1) {
                // Fallback: Standard Base64 (Legacy-Tokens)
                payloadJson = new String(Base64.getDecoder().decode(padBase64(payloadB64)));
            }

            // Expiry pruefen
            Matcher expMatcher = EXP_PATTERN.matcher(payloadJson);
            if (expMatcher.find()) {
                long exp = Long.parseLong(expMatcher.group(1));
                if (exp < System.currentTimeMillis() / 1000) {
                    return null;
                }
            }

            // Sub (userId) extrahieren
            Matcher subMatcher = SUB_PATTERN.matcher(payloadJson);
            if (!subMatcher.find()) {
                return null;
            }
            String sub = subMatcher.group(1);

            // Rollen extrahieren
            List<String> roles = new ArrayList<>();
            Matcher rolesMatcher = ROLES_PATTERN.matcher(payloadJson);
            if (rolesMatcher.find()) {
                String rolesStr = rolesMatcher.group(1);
                if (!rolesStr.isEmpty()) {
                    for (String r : rolesStr.split(",")) {
                        String role = r.trim().replaceAll("^\"|\"$", "");
                        if (!role.isEmpty()) {
                            roles.add(role);
                        }
                    }
                }
            }

            // MandantId extrahieren (optional, fuer HOCHSCHUL_VERWALTER)
            Long mandantId = null;
            Matcher mandantMatcher = MANDANT_ID_PATTERN.matcher(payloadJson);
            if (mandantMatcher.find()) {
                mandantId = Long.parseLong(mandantMatcher.group(1));
            }

            return new ParsedToken(sub, roles, mandantId);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Verifiziert die HMAC-SHA256 Signatur eines JWT.
     */
    private static boolean verifySignature(String headerB64, String payloadB64, String signatureB64) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecretBytes, "HmacSHA256"));
            byte[] computed = mac.doFinal((headerB64 + "." + payloadB64).getBytes(StandardCharsets.UTF_8));
            byte[] provided = Base64.getUrlDecoder().decode(padBase64(signatureB64));
            return java.security.MessageDigest.isEqual(computed, provided);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Fuegt fehlende Base64-Padding-Zeichen hinzu (JWT laesst diese weg).
     */
    private static String padBase64(String b64) {
        switch (b64.length() % 4) {
            case 2: return b64 + "==";
            case 3: return b64 + "=";
            default: return b64;
        }
    }

    public static final class ParsedToken {
        private final String userId;
        private final List<String> roles;
        private final Long mandantId;

        public ParsedToken(String userId, List<String> roles, Long mandantId) {
            this.userId = userId;
            this.roles = roles != null ? List.copyOf(roles) : List.of();
            this.mandantId = mandantId;
        }

        public String getUserId() { return userId; }
        public List<String> getRoles() { return roles; }
        /** MandantId des Benutzers (fuer HOCHSCHUL_VERWALTER-Scoping). */
        public Long getMandantId() { return mandantId; }
    }
}
