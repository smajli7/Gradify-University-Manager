package de.gradify.studiengang.config;

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
     * - ADMIN: Voller Zugriff auf alle Studiengang-Operationen
     * - DOZENT: Kann Studiengaenge und Module lesen
     * - PRUEFUNGSAMT: Kann Einschreibungen verwalten
     * - STUDENT: Kann eigene Einschreibungen und Studiengaenge lesen
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Swagger/OpenAPI immer erlauben
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                
                // Mandanten-Verwaltung: nur ADMIN
                .requestMatchers(HttpMethod.POST, "/api/mandanten/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/mandanten/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/mandanten/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/mandanten/**").authenticated()
                
                // Studiengaenge: Schreibzugriff nur ADMIN, Lesen fuer alle
                .requestMatchers(HttpMethod.POST, "/api/studiengaenge/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/studiengaenge/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/studiengaenge/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/studiengaenge/**").authenticated()
                
                // Module: Schreibzugriff nur ADMIN, Lesen fuer alle
                .requestMatchers(HttpMethod.POST, "/api/module/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/module/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/module/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/module/**").authenticated()
                
                // Pruefungsordnungen: Schreibzugriff nur ADMIN
                .requestMatchers(HttpMethod.POST, "/api/pruefungsordnungen/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/pruefungsordnungen/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/pruefungsordnungen/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/pruefungsordnungen/**").authenticated()
                
                // Einschreibungen: PRUEFUNGSAMT und ADMIN koennen verwalten
                .requestMatchers(HttpMethod.POST, "/api/einschreibungen/**").hasAnyRole("PRUEFUNGSAMT", "ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/einschreibungen/**").hasAnyRole("PRUEFUNGSAMT", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/einschreibungen/**").hasAnyRole("PRUEFUNGSAMT", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/einschreibungen/**").authenticated()
                
                // GraphQL fuer flexible Abfragen
                .requestMatchers("/graphql/**").authenticated()
                
                .anyRequest().authenticated()
            );
        return http.build();
    }
}



