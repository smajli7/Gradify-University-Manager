package de.gradify.user.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("print-hash") // Nur mit spring.profiles.active=print-hash
@RequiredArgsConstructor
@Slf4j
public class PasswordHashPrinter implements CommandLineRunner {

    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String password = "web00100113!";
        String hash = passwordEncoder.encode(password);
        
        log.info("=".repeat(80));
        log.info("BCrypt Hash Generator - Password: {}", password);
        log.info("=".repeat(80));
        log.info("");
        log.info("Generated Hash:");
        log.info("{}", hash);
        log.info("");
        log.info("Verification test:");
        log.info("Matches: {}", passwordEncoder.matches(password, hash));
        log.info("");
        log.info("Testing OLD hash from data.sql:");
        String oldHash = "$2a$10$rDkPvvAFV6kqhMqI9BVdxuIW.aWZXZ9sQGfEV0bEFKAQ8tCZzxKlW";
        log.info("Old Hash: {}", oldHash);
        log.info("Old hash matches password '{}': {}", password, passwordEncoder.matches(password, oldHash));
        log.info("");
        log.info("=".repeat(80));
        log.info("COPY THIS HASH TO data.sql:");
        log.info("{}", hash);
        log.info("=".repeat(80));
        
        // Service sofort beenden
        System.exit(0);
    }
}
