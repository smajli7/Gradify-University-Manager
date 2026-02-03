package de.gradify.shared.security;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parser für Gradify Access-Tokens.
 * Format: gradify.{header}.{payload}.{signature}
 * Payload ist Base64-kodiertes JSON mit sub, name, roles, exp.
 */
public final class GradifyTokenParser {

    private static final Pattern SUB_PATTERN = Pattern.compile("\"sub\":\"([^\"]+)\"");
    private static final Pattern ROLES_PATTERN = Pattern.compile("\"roles\":\\[([^\\]]*)\\]");
    private static final Pattern EXP_PATTERN = Pattern.compile("\"exp\":(\\d+)");

    private GradifyTokenParser() {}

    /**
     * Parst und validiert den Token. Extrahiert User-ID und Rollen.
     * @return ParsedToken mit userId und Rollen, oder null wenn ungültig
     */
    public static ParsedToken parseAndValidate(String token) {
        if (token == null || !token.startsWith("gradify.")) {
            return null;
        }
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 4) {
                return null;
            }
            String payloadJson = new String(Base64.getDecoder().decode(parts[2]));

            // Expiry prüfen
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

            return new ParsedToken(sub, roles);
        } catch (Exception e) {
            return null;
        }
    }

    public static final class ParsedToken {
        private final String userId;
        private final List<String> roles;

        public ParsedToken(String userId, List<String> roles) {
            this.userId = userId;
            this.roles = roles != null ? List.copyOf(roles) : List.of();
        }

        public String getUserId() {
            return userId;
        }

        public List<String> getRoles() {
            return roles;
        }
    }
}
