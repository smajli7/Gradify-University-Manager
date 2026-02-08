package de.gradify.studiengang.config;

import de.gradify.shared.security.GradifyTokenParser;
import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantSuffixResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "gradify.tenant-routing.enabled", havingValue = "true")
@Slf4j
public class TenantContextFilter extends OncePerRequestFilter {

    private final TenantSuffixResolver tenantSuffixResolver;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            log.info("[TenantFilter] {} {} - Start", request.getMethod(), request.getRequestURI());
            String mandantIdStr = request.getHeader("X-Mandant-Id");
            if ((mandantIdStr == null || mandantIdStr.isBlank()) && request.getParameter("mandantId") != null) {
                mandantIdStr = request.getParameter("mandantId");
            }
            if (mandantIdStr != null && !mandantIdStr.isBlank()) {
                try {
                    Long mandantId = Long.parseLong(mandantIdStr.trim());
                    String suffix = tenantSuffixResolver.resolve(mandantId);
                    log.info("[TenantFilter] X-Mandant-Id={} -> suffix={}", mandantId, suffix);
                    if (suffix != null) {
                        TenantContext.setTenantSuffix(suffix);
                    }
                } catch (NumberFormatException ignored) {}
            }
            if (TenantContext.getTenantSuffix() == null) {
                String authHeader = request.getHeader("Authorization");
                log.info("[TenantFilter] Authorization header present: {}", authHeader != null);
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    var parsed = GradifyTokenParser.parseAndValidate(authHeader.substring(7));
                    if (parsed != null) {
                        log.info("[TenantFilter] JWT parsed: userId={}, mandantId={}, roles={}", parsed.getUserId(), parsed.getMandantId(), parsed.getRoles());
                        if (parsed.getMandantId() != null) {
                            String suffix = tenantSuffixResolver.resolve(parsed.getMandantId());
                            log.info("[TenantFilter] mandantId={} resolved to suffix={}", parsed.getMandantId(), suffix);
                            if (suffix != null) {
                                TenantContext.setTenantSuffix(suffix);
                            }
                        }
                    } else {
                        log.warn("[TenantFilter] JWT parse returned null! Token may be invalid or expired.");
                    }
                }
            }
            if (TenantContext.getTenantSuffix() == null && !tenantSuffixResolver.getAllSuffixes().isEmpty()) {
                // Fallback: erster Tenant fuer Requests ohne Mandant-Zuordnung (z.B. Admin-Aggregation)
                String fallback = tenantSuffixResolver.getAllSuffixes().get(0);
                log.warn("[TenantFilter] FALLBACK to '{}' for {} {}", fallback, request.getMethod(), request.getRequestURI());
                TenantContext.setTenantSuffix(fallback);
            }
            log.info("[TenantFilter] Final TenantContext suffix: {}", TenantContext.getTenantSuffix());
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
