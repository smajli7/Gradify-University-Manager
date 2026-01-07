package de.gradify.user.service;

import de.gradify.user.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Generiert eindeutige Matrikelnummern im Format: [KÜRZEL][JAHR][NUMMER]
 * Beispiel: BVT2026001 (Bioverfahrenstechnik, 2026, 1. Student)
 */
@Service
@RequiredArgsConstructor
public class MatrikelnummerGenerator {

    private final StudentRepository studentRepository;
    
    // Thread-safe counter für Matrikelnummern innerhalb einer Transaktion
    private final AtomicInteger counter = new AtomicInteger(0);

    /**
     * Generiert eine neue Matrikelnummer für einen Mandanten.
     * 
     * @param mandantKuerzel Das Kürzel des Mandanten (z.B. "BVT", "FSA")
     * @return Die generierte Matrikelnummer (z.B. "BVT2026001")
     */
    public String generate(String mandantKuerzel) {
        String kuerzel = sanitizeKuerzel(mandantKuerzel);
        int jahr = Year.now().getValue();
        int nummer = getNextNumber(kuerzel, jahr);
        
        return String.format("%s%d%03d", kuerzel, jahr, nummer);
    }

    /**
     * Bereinigt das Kürzel (nur Großbuchstaben, max 5 Zeichen).
     */
    private String sanitizeKuerzel(String kuerzel) {
        if (kuerzel == null || kuerzel.isBlank()) {
            return "UNK"; // Unknown
        }
        return kuerzel.toUpperCase()
                      .replaceAll("[^A-Z]", "")
                      .substring(0, Math.min(kuerzel.length(), 5));
    }

    /**
     * Ermittelt die nächste freie Nummer für ein Kürzel/Jahr.
     */
    private int getNextNumber(String kuerzel, int jahr) {
        String prefix = kuerzel + jahr;
        
        // Suche die höchste existierende Nummer mit diesem Prefix
        return studentRepository.findAll().stream()
                .map(s -> s.getMatrikelnummer())
                .filter(m -> m != null && m.startsWith(prefix))
                .map(m -> {
                    try {
                        return Integer.parseInt(m.substring(prefix.length()));
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .max(Integer::compareTo)
                .orElse(0) + 1;
    }
    
    /**
     * Prüft ob eine Matrikelnummer gültig ist.
     */
    public boolean isValid(String matrikelnummer) {
        if (matrikelnummer == null || matrikelnummer.length() < 10) {
            return false;
        }
        // Format: [A-Z]{2,5}[0-9]{4}[0-9]{3,}
        return matrikelnummer.matches("^[A-Z]{2,5}\\d{7,}$");
    }
}


