package de.gradify.user.config;

import de.gradify.shared.security.GradifyTokenParser;
import de.gradify.shared.security.GradifyTokenParser.ParsedToken;
import de.gradify.user.config.AuthPrincipal;
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

import java.io.IOException;
import java.util.stream.Collectors;

/**
 * Filter, der den Gradify Bearer-Token validiert und die Authentication setzt.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

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
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        ParsedToken parsed = GradifyTokenParser.parseAndValidate(token);
        if (parsed != null) {
            var authorities = parsed.getRoles().stream()
                    .map(SimpleGrantedAuthority::new)
                    .collect(Collectors.toList());
            AuthPrincipal principal = AuthPrincipal.from(
                    parsed.getUserId(),
                    parsed.getMandantId(),
                    parsed.getRoles()
            );
            var auth = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    authorities
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
