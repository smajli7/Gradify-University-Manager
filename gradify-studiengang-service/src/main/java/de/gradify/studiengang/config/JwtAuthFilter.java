package de.gradify.studiengang.config;

import de.gradify.studiengang.config.AuthPrincipal;
import de.gradify.shared.security.GradifyTokenParser;
import de.gradify.shared.security.GradifyTokenParser.ParsedToken;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {
    private static final Pattern ROLES_ARRAY_PATTERN = Pattern.compile("\"roles\"\\s*:\\s*\\[(.*?)\\]");
    private static final Pattern ROLE_VALUE_PATTERN = Pattern.compile("\"([A-Z_]+)\"");

    @Value("${jwt.secret:gradify-secret-key-change-in-production-min-256-bit}")
    private String jwtSecret;

    @PostConstruct
    public void init() {
        GradifyTokenParser.configureSecret(jwtSecret);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No Bearer token for {} {} (Authorization: {})",
                    request.getMethod(), request.getRequestURI(),
                    authHeader == null ? "MISSING" : "present");
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        ParsedToken parsed = GradifyTokenParser.parseAndValidate(token);
        if (parsed != null) {
            List<String> roles = parsed.getRoles();
            if (roles == null || roles.isEmpty()) {
                roles = extractRolesFromTokenPayload(token);
            }

            var authorities = roles.stream()
                    .filter(r -> r != null && !r.isBlank())
                    .map(r -> r.startsWith("ROLE_") ? r.trim() : "ROLE_" + r.trim())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
            AuthPrincipal principal = AuthPrincipal.from(
                    parsed.getUserId(),
                    parsed.getMandantId(),
                    roles
            );
            var auth = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    authorities
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("JWT OK {} {} – userId={}, authorities={}",
                    request.getMethod(), request.getRequestURI(), parsed.getUserId(), authorities);
        } else {
            log.warn("JWT parse FAILED for {} {} – token len={}",
                    request.getMethod(), request.getRequestURI(), token.length());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Fallback fuer den Fall, dass der Shared-Parser keine Rollen extrahieren konnte.
     * Liest den JWT-Payload direkt und extrahiert Rollen robust ueber Regex.
     */
    private List<String> extractRolesFromTokenPayload(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) return List.of();
            String payloadB64 = parts[1];
            String payloadJson = new String(Base64.getUrlDecoder().decode(padBase64(payloadB64)), StandardCharsets.UTF_8);

            Matcher arrayMatcher = ROLES_ARRAY_PATTERN.matcher(payloadJson);
            if (!arrayMatcher.find()) return List.of();

            String rolesArray = arrayMatcher.group(1);
            Matcher roleMatcher = ROLE_VALUE_PATTERN.matcher(rolesArray);
            List<String> roles = new ArrayList<>();
            while (roleMatcher.find()) {
                roles.add(roleMatcher.group(1));
            }
            return roles;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String padBase64(String b64) {
        int mod = b64.length() % 4;
        if (mod == 2) return b64 + "==";
        if (mod == 3) return b64 + "=";
        return b64;
    }
}
