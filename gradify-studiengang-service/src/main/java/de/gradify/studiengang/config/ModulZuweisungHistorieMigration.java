package de.gradify.studiengang.config;

import de.gradify.shared.tenant.TenantSuffixResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;

/**
 * Führt Migration für modul_zuweisung_historie in allen Studiengang-Tenant-DBs aus.
 * Erstellt die Tabelle, falls sie noch nicht existiert (CREATE TABLE IF NOT EXISTS).
 */
@Component
@Order(110)
@Slf4j
public class ModulZuweisungHistorieMigration implements CommandLineRunner {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/gradify_studiengang}")
    private String datasourceUrl;
    @Value("${spring.datasource.username:gradify}")
    private String username;
    @Value("${spring.datasource.password:gradify123}")
    private String password;

    private final TenantSuffixResolver tenantSuffixResolver;

    public ModulZuweisungHistorieMigration(@Autowired(required = false) TenantSuffixResolver tenantSuffixResolver) {
        this.tenantSuffixResolver = tenantSuffixResolver;
    }

    @Override
    public void run(String... args) {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("db/migration/V001__modul_zuweisung_historie.sql"));
        populator.setContinueOnError(true);

        String urlBase = datasourceUrl.replaceAll("/[^/?]+(\\?.*)?$", "");

        if (tenantSuffixResolver != null) {
            List<String> suffixes = tenantSuffixResolver.getAllSuffixes();
            if (suffixes != null && !suffixes.isEmpty()) {
                for (String suffix : suffixes) {
                    runMigration(urlBase + "/gradify_studiengang_" + suffix, "gradify_studiengang_" + suffix, populator);
                }
                return;
            }
        }

        runMigration(datasourceUrl, "default", populator);
    }

    private void runMigration(String jdbcUrl, String label, ResourceDatabasePopulator populator) {
        try {
            DataSource ds = new DriverManagerDataSource(jdbcUrl, username, password);
            populator.execute(ds);
            log.info("Migration modul_zuweisung_historie ausgeführt: {}", label);
        } catch (Exception e) {
            log.warn("Migration für {} fehlgeschlagen: {}", label, e.getMessage());
        }
    }
}
