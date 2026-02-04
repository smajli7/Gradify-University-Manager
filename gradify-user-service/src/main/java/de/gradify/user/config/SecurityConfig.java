package de.gradify.user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Security-Konfiguration mit Authentifizierung (für dev und prod).
     */
    @Bean
    public SecurityFilterChain prodSecurityFilterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter,
            @org.springframework.beans.factory.annotation.Autowired(required = false) de.gradify.user.config.TenantContextFilter tenantContextFilter) throws Exception {
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
                // Rollen-basierte Zugriffskontrolle
                .requestMatchers("/api/students/**").hasAnyRole("ADMIN", "LEHRENDER", "PRUEFUNGSAMT", "HOCHSCHUL_VERWALTER")
                .requestMatchers("/api/users/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .requestMatchers("/graphql/**").authenticated()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
