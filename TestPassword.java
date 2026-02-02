import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class TestPassword {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String password = "web00100113!";
        String storedHash = "$2a$10$rDkPvvAFV6kqhMqI9BVdxuIW.aWZXZ9sQGfEV0bEFKAQ8tCZzxKlW";
        
        System.out.println("Password: " + password);
        System.out.println("Hash: " + storedHash);
        System.out.println("Matches: " + encoder.matches(password, storedHash));
    }
}
