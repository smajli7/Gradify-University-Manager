package de.gradify.user.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility zum Generieren von BCrypt Password Hashes.
 * Kann mit: mvn exec:java -Dexec.mainClass="de.gradify.user.util.PasswordHashGenerator" ausgeführt werden
 */
public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10); // Rounds = 10
        String password = "web00100113!";
        
        System.out.println("=================================");
        System.out.println("BCrypt Password Hash Generator");
        System.out.println("=================================");
        System.out.println();
        System.out.println("Password: " + password);
        System.out.println();
        
        // Generiere Hash
        String hash = encoder.encode(password);
        System.out.println("Generated Hash:");
        System.out.println(hash);
        System.out.println();
        
        // Verifiziere Hash
        boolean matches = encoder.matches(password, hash);
        System.out.println("Verification: " + (matches ? "SUCCESS" : "FAILED"));
        System.out.println();
        
        // Teste alten Hash aus data.sql
        String oldHash = "$2a$10$rDkPvvAFV6kqhMqI9BVdxuIW.aWZXZ9sQGfEV0bEFKAQ8tCZzxKlW";
        System.out.println("Testing OLD hash from data.sql:");
        System.out.println(oldHash);
        boolean oldMatches = encoder.matches(password, oldHash);
        System.out.println("Old hash matches: " + (oldMatches ? "YES" : "NO"));
        System.out.println();
        
        System.out.println("=================================");
        System.out.println("Use this hash in your data.sql:");
        System.out.println(hash);
        System.out.println("=================================");
    }
}
