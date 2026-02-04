package de.gradify.user.config;

import de.gradify.shared.security.GradifyTokenParser;
import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantSuffixResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Setzt TenantContext aus JWT oder X-Mandant-Id Header und räumt danach auf.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "gradify.tenant-routing.enabled", havingValue = "true")
public class TenantContextFilter extends OncePerRequestFilter {

    private final TenantSuffixResolver tenantSuffixResolver;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // 1. X-Mandant-Id Header (z.B. für Admin-Auswahl)
            String mandantIdStr = request.getHeader("X-Mandant-Id");
            if ((mandantIdStr == null || mandantIdStr.isBlank()) && request.getParameter("mandantId") != null) {
                mandantIdStr = request.getParameter("mandantId");
            }
            if (mandantIdStr != null && !mandantIdStr.isBlank()) {
                try {
                    Long mandantId = Long.parseLong(mandantIdStr.trim());
                    String suffix = tenantSuffixResolver.resolve(mandantId);
                    if (suffix != null) {
                        TenantContext.setTenantSuffix(suffix);
                    }
                } catch (NumberFormatException ignored) {}
            }
            // 2. Aus JWT falls noch nicht gesetzt
            if (TenantContext.getTenantSuffix() == null) {
                String authHeader = request.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    var parsed = GradifyTokenParser.parseAndValidate(authHeader.substring(7));
                    if (parsed != null && parsed.getMandantId() != null) {
                        String suffix = tenantSuffixResolver.resolve(parsed.getMandantId());
                        if (suffix != null) {
                            TenantContext.setTenantSuffix(suffix);
                        }
                    }
                }
            }
            // 3. Fallback: erster Tenant (für ADMIN ohne Auswahl)
            if (TenantContext.getTenantSuffix() == null && !tenantSuffixResolver.getAllSuffixes().isEmpty()) {
                TenantContext.setTenantSuffix(tenantSuffixResolver.getAllSuffixes().get(0));
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
