package de.gradify.berechnung.config;

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
     * - ADMIN: Voller Zugriff auf alle Berechnungs-Operationen
     * - DOZENT: Kann Berechnungen lesen
     * - PRUEFUNGSAMT: Kann Berechnungen ausfuehren und lesen
     * - STUDENT: Kann nur eigene Berechnungen lesen
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
                
                // Berechnungen ausfuehren: PRUEFUNGSAMT, ADMIN
                .requestMatchers(HttpMethod.POST, "/api/berechnungen/**").hasAnyRole("PRUEFUNGSAMT", "ADMIN")
                
                // Berechnungen lesen: alle authentifizierten Nutzer
                .requestMatchers(HttpMethod.GET, "/api/berechnungen/**").authenticated()
                
                // Statistiken: DOZENT, PRUEFUNGSAMT, ADMIN
                .requestMatchers("/api/berechnungen/statistik/**").hasAnyRole("DOZENT", "PRUEFUNGSAMT", "ADMIN")
                
                .anyRequest().authenticated()
            );
        return http.build();
    }
}


