package de.gradify.noten.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    /**
     * Security-Konfiguration fuer Entwicklung - alle Endpoints offen.
     */
    @Bean
    @Profile("dev")
    public SecurityFilterChain devSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll()
            );
        return http.build();
    }

    /**
     * Security-Konfiguration fuer Produktion - mit Rollen-basierter Zugriffskontrolle.
     * 
     * Rollen und Berechtigungen:
     * - ADMIN: Voller Zugriff auf alle Noten-Operationen
     * - DOZENT: Kann Noten erfassen und validieren (eigene Module)
     * - PRUEFUNGSAMT: Kann Noten validieren und freigeben
     * - STUDENT: Kann nur eigene Noten lesen (ueber GraphQL)
     */
    @Bean
    @Profile("prod")
    public SecurityFilterChain prodSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Swagger/OpenAPI immer erlauben
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/v3/api-docs.yaml").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                
                // Noten-Endpunkte mit Rollen-Kontrolle
                // Noten erfassen: DOZENT, ADMIN
                .requestMatchers(HttpMethod.POST, "/api/noten").hasAnyRole("DOZENT", "ADMIN")
                
                // Noten bearbeiten: DOZENT, ADMIN
                .requestMatchers(HttpMethod.PUT, "/api/noten/**").hasAnyRole("DOZENT", "ADMIN")
                
                // Noten validieren: DOZENT, PRUEFUNGSAMT, ADMIN
                .requestMatchers(HttpMethod.POST, "/api/noten/*/validate").hasAnyRole("DOZENT", "PRUEFUNGSAMT", "ADMIN")
                
                // Noten freigeben: nur PRUEFUNGSAMT, ADMIN
                .requestMatchers(HttpMethod.POST, "/api/noten/*/release").hasAnyRole("PRUEFUNGSAMT", "ADMIN")
                
                // Noten loeschen: nur ADMIN
                .requestMatchers(HttpMethod.DELETE, "/api/noten/**").hasRole("ADMIN")
                
                // Noten lesen: alle authentifizierten Nutzer (Detailfilterung im Service)
                .requestMatchers(HttpMethod.GET, "/api/noten/**").authenticated()
                
                // GraphQL fuer flexible Abfragen
                .requestMatchers("/graphql/**").authenticated()
                
                .anyRequest().authenticated()
            );
        return http.build();
    }
}



