package de.gradify.noten.config;

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
     * - ADMIN: Voller Zugriff auf alle Noten-Operationen
     * - DOZENT: Kann Noten erfassen und validieren (eigene Module)
     * - PRUEFUNGSAMT: Kann Noten validieren und freigeben
     * - STUDENT: Kann nur eigene Noten lesen (ueber GraphQL)
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
                
                // Noten-Endpunkte mit Rollen-Kontrolle
                // Noten erfassen: LEHRENDER, ADMIN
                .requestMatchers(HttpMethod.POST, "/api/noten").hasAnyRole("LEHRENDER", "ADMIN")

                // Noten bearbeiten: LEHRENDER, ADMIN
                .requestMatchers(HttpMethod.PUT, "/api/noten/**").hasAnyRole("LEHRENDER", "ADMIN")

                // Noten validieren: LEHRENDER, PRUEFUNGSAMT, ADMIN, HOCHSCHUL_VERWALTER
                .requestMatchers(HttpMethod.POST, "/api/noten/*/validate").hasAnyRole("LEHRENDER", "PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER")

                // Noten freigeben: PRUEFUNGSAMT, ADMIN, HOCHSCHUL_VERWALTER
                .requestMatchers(HttpMethod.POST, "/api/noten/*/release").hasAnyRole("PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER")
                
                // Noten loeschen: nur ADMIN
                .requestMatchers(HttpMethod.DELETE, "/api/noten/**").hasRole("ADMIN")
                
                // Audit-Log (Protokoll): PRUEFUNGSAMT, ADMIN, HV, LEHRENDER (Datenfilterung im Controller)
                .requestMatchers(HttpMethod.GET, "/api/noten/audit").hasAnyRole("PRUEFUNGSAMT", "ADMIN", "HOCHSCHUL_VERWALTER", "LEHRENDER")
                // Noten lesen: alle authentifizierten Nutzer (Detailfilterung im Service)
                .requestMatchers(HttpMethod.GET, "/api/noten/**").authenticated()
                
                // GraphQL fuer flexible Abfragen
                .requestMatchers("/graphql/**").authenticated()
                
                .anyRequest().authenticated()
            );
        return http.build();
    }
}



