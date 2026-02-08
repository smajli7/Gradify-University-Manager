package de.gradify.noten.config;

import de.gradify.shared.security.GradifyTokenParser;
import de.gradify.shared.security.GradifyTokenParser.ParsedToken;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${jwt.secret:gradify-secret-key-change-in-production-min-256-bit}")
    private String jwtSecret;

    @PostConstruct
    public void init() {
        GradifyTokenParser.configureSecret(jwtSecret);
        log.info("JwtAuthFilter initialized with secret (length={})", jwtSecret.length());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No Bearer token for {} {} (Authorization header: {})",
                    request.getMethod(), request.getRequestURI(),
                    authHeader == null ? "MISSING" : "present but not Bearer");
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        ParsedToken parsed = GradifyTokenParser.parseAndValidate(token);
        if (parsed != null) {
            // Spring Security hasRole() erwartet Authorities mit Prefix "ROLE_"
            List<SimpleGrantedAuthority> authorities = parsed.getRoles().stream()
                    .filter(r -> r != null && !r.isBlank())
                    .map(r -> r.startsWith("ROLE_") ? r.trim() : "ROLE_" + r.trim())
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
            var auth = new UsernamePasswordAuthenticationToken(
                    parsed.getUserId(),
                    null,
                    authorities
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
            log.debug("JWT authenticated: userId={}, roles={} for {} {}",
                    parsed.getUserId(), authorities, request.getMethod(), request.getRequestURI());
        } else {
            log.warn("JWT token parsing FAILED for {} {} – token length={}, first 20 chars={}",
                    request.getMethod(), request.getRequestURI(),
                    token.length(), token.substring(0, Math.min(20, token.length())));
        }

        filterChain.doFilter(request, response);
    }
}
