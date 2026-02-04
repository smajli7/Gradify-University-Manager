package de.gradify.berechnung.config;

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

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    /**
     * Security-Konfiguration mit Rollen-basierter Zugriffskontrolle (für dev und prod).
     * 
     * Rollen und Berechtigungen:
     * - ADMIN: Voller Zugriff auf alle Berechnungs-Operationen
     * - DOZENT: Kann Berechnungen lesen
     * - PRUEFUNGSAMT: Kann Berechnungen ausfuehren und lesen
     * - STUDENT: Kann nur eigene Berechnungen lesen
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
            .authorizeHttpRequests(auth -> auth
                // Swagger/OpenAPI immer erlauben
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                
                // Berechnungen ausfuehren: PRUEFUNGSAMT, ADMIN, HOCHSCHUL_VERWALTER
                .requestMatchers(HttpMethod.POST, "/api/berechnungen/**").hasAnyRole("PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER")
                
                // Berechnungen lesen: alle authentifizierten Nutzer
                .requestMatchers(HttpMethod.GET, "/api/berechnungen/**").authenticated()
                
                // Statistiken: LEHRENDER, PRUEFUNGSAMT, ADMIN, HOCHSCHUL_VERWALTER
                .requestMatchers("/api/berechnungen/statistik/**").hasAnyRole("LEHRENDER", "PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER")
                
                .anyRequest().authenticated()
            );
        return http.build();
    }
}



