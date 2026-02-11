package de.gradify.studiengang.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
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
     * - ADMIN: Voller Zugriff auf alle Studiengang-Operationen
     * - HOCHSCHUL_VERWALTER: Wie Pruefungsamt + Studiengaenge/Module/Import fuer eigene Hochschule (1:1)
     * - PRUEFUNGSAMT: Kann Einschreibungen verwalten
     * - STUDENT: Kann eigene Einschreibungen und Studiengaenge lesen
     *
     * WICHTIG: AntPathRequestMatcher fuer module-zuweisungen, da MvcRequestMatcher in Spring Security 6
     * unter bestimmten Umstaenden Wildcard-Patterns nicht korrekt matcht.
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
                    log.warn("ACCESS DENIED {} {} – authenticated={}, principal={}, authorities={}, reason={}",
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
                
                // Mandanten-Verwaltung: nur ADMIN
                .requestMatchers(HttpMethod.POST, "/api/mandanten/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/mandanten/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/mandanten/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/mandanten/**").authenticated()
                
                // Studiengaenge anlegen/aendern: nur Pruefungsamt und Hochschulverwalter
                .requestMatchers(HttpMethod.POST, "/api/studiengaenge/**").hasAnyRole("PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.PUT, "/api/studiengaenge/**").hasAnyRole("PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.DELETE, "/api/studiengaenge/**").hasAnyRole("PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.GET, "/api/studiengaenge/**").authenticated()
                
                // module-zuweisungen VOR module/** (spezifischer Pfad zuerst), /** wie Noten-Service
                .requestMatchers(new AntPathRequestMatcher("/api/module-zuweisungen/audit", "GET")).hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER", "PRUEFUNGSAMT", "LEHRENDER")
                .requestMatchers(new AntPathRequestMatcher("/api/module-zuweisungen/**", "OPTIONS")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/module-zuweisungen/**", "POST")).hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER", "PRUEFUNGSAMT")
                .requestMatchers(new AntPathRequestMatcher("/api/module-zuweisungen/**", "DELETE")).hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER", "PRUEFUNGSAMT")
                // Module: Schreibzugriff ADMIN + HOCHSCHUL_VERWALTER
                .requestMatchers(HttpMethod.POST, "/api/module/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.PUT, "/api/module/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.DELETE, "/api/module/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.GET, "/api/module/**").authenticated()
                
                // Pruefungsordnungen: ADMIN + HOCHSCHUL_VERWALTER
                .requestMatchers(HttpMethod.POST, "/api/pruefungsordnungen/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.PUT, "/api/pruefungsordnungen/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.DELETE, "/api/pruefungsordnungen/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.GET, "/api/pruefungsordnungen/**").authenticated()
                
                // Einschreibungen: nur Pruefungsamt und Hochschulverwalter (wie Studiengang anlegen)
                .requestMatchers(HttpMethod.POST, "/api/einschreibungen/**").hasAnyRole("PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.PUT, "/api/einschreibungen/**").hasAnyRole("PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.DELETE, "/api/einschreibungen/**").hasAnyRole("PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.GET, "/api/einschreibungen/**").authenticated()
                
                // CSV Import/Export: ADMIN + HOCHSCHUL_VERWALTER (HV nur eigene Hochschule)
                .requestMatchers(HttpMethod.POST, "/api/import/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                .requestMatchers(HttpMethod.GET, "/api/import/**").hasAnyRole("ADMIN", "HOCHSCHUL_VERWALTER")
                
                // GraphQL fuer flexible Abfragen
                .requestMatchers("/graphql/**").authenticated()
                
                .anyRequest().authenticated()
            );
        return http.build();
    }
}



