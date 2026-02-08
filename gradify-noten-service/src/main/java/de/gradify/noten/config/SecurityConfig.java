package de.gradify.noten.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@Slf4j
public class SecurityConfig {

    /**
     * Security-Konfiguration mit Rollen-basierter Zugriffskontrolle (für dev und prod).
     *
     * Rollen und Berechtigungen:
     * - ADMIN: Voller Zugriff auf alle Noten-Operationen
     * - DOZENT: Kann Noten erfassen und validieren (eigene Module)
     * - PRUEFUNGSAMT: Kann Noten validieren und freigeben / zurücknehmen
     * - STUDENT: Kann nur eigene Noten lesen (ueber GraphQL)
     *
     * WICHTIG: AntPathRequestMatcher wird explizit verwendet, da MvcRequestMatcher
     * in Spring Security 6 unter bestimmten Umständen Wildcard-Patterns nicht korrekt matcht.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter,
            @org.springframework.beans.factory.annotation.Autowired(required = false) TenantContextFilter tenantContextFilter) throws Exception {
        if (tenantContextFilter != null) {
            http.addFilterBefore(tenantContextFilter, UsernamePasswordAuthenticationFilter.class);
        }
        http
            .csrf(AbstractHttpConfigurer::disable)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                    log.warn("ACCESS DENIED for {} {} – authenticated={}, principal={}, authorities={}, reason={}",
                            request.getMethod(), request.getRequestURI(),
                            auth != null && auth.isAuthenticated(),
                            auth != null ? auth.getPrincipal() : "null",
                            auth != null ? auth.getAuthorities() : "null",
                            accessDeniedException.getMessage());
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"Zugriff verweigert: Fehlende Berechtigung\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Swagger/OpenAPI immer erlauben
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                .requestMatchers("/actuator/**").permitAll()

                // POST-Endpunkte: explizite AntPathRequestMatcher für zuverlässiges Wildcard-Matching
                // Noten erfassen: LEHRENDER, ADMIN
                .requestMatchers(new AntPathRequestMatcher("/api/noten", "POST")).hasAnyRole("LEHRENDER", "ADMIN")

                // Noten validieren: LEHRENDER, PRUEFUNGSAMT, ADMIN, HOCHSCHUL_VERWALTER
                .requestMatchers(new AntPathRequestMatcher("/api/noten/*/validate", "POST")).hasAnyRole("LEHRENDER", "PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER")

                // Noten freigeben: PRUEFUNGSAMT, ADMIN, HOCHSCHUL_VERWALTER
                .requestMatchers(new AntPathRequestMatcher("/api/noten/*/release", "POST")).hasAnyRole("PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER")

                // Freigabe zurücknehmen: PRUEFUNGSAMT, ADMIN, HOCHSCHUL_VERWALTER
                .requestMatchers(new AntPathRequestMatcher("/api/noten/*/reject", "POST")).hasAnyRole("PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER")

                // Noten bearbeiten: LEHRENDER, ADMIN, PRUEFUNGSAMT, HOCHSCHUL_VERWALTER
                .requestMatchers(new AntPathRequestMatcher("/api/noten/**", "PUT")).hasAnyRole("LEHRENDER", "ADMIN", "PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")

                // Noten loeschen: nur ADMIN
                .requestMatchers(new AntPathRequestMatcher("/api/noten/**", "DELETE")).hasRole("ADMIN")

                // Audit-Log (Protokoll): PRUEFUNGSAMT, ADMIN, HV, LEHRENDER
                .requestMatchers(new AntPathRequestMatcher("/api/noten/audit", "GET")).hasAnyRole("PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER", "LEHRENDER")

                // Noten lesen: alle authentifizierten Nutzer
                .requestMatchers(new AntPathRequestMatcher("/api/noten/**", "GET")).authenticated()

                // GraphQL fuer flexible Abfragen
                .requestMatchers("/graphql/**").authenticated()

                .anyRequest().authenticated()
            );
        return http.build();
    }
}



