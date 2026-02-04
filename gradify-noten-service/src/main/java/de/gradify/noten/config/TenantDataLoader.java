package de.gradify.noten.config;

import de.gradify.shared.tenant.TenantSuffixResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;

@Component
@Profile("dev")
@Order(100)
@ConditionalOnProperty(name = "gradify.tenant-routing.enabled", havingValue = "true")
@Slf4j
public class TenantDataLoader implements CommandLineRunner {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/gradify_noten}")
    private String datasourceUrl;
    @Value("${spring.datasource.username:gradify}")
    private String username;
    @Value("${spring.datasource.password:gradify123}")
    private String password;

    private final TenantSuffixResolver tenantSuffixResolver;

    public TenantDataLoader(@Autowired(required = false) TenantSuffixResolver tenantSuffixResolver) {
        this.tenantSuffixResolver = tenantSuffixResolver;
    }

    @Override
    public void run(String... args) {
        if (tenantSuffixResolver == null) return;
        List<String> suffixes = tenantSuffixResolver.getAllSuffixes();
        if (suffixes == null || !suffixes.contains("gu")) return;

        String urlBase = datasourceUrl.replaceAll("/[^/?]+(\\?.*)?$", "");
        String guUrl = urlBase + "/gradify_noten_gu";

        try {
            DataSource ds = new DriverManagerDataSource(guUrl, username, password);
            ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
            populator.addScript(new ClassPathResource("schema-tenant.sql"));
            populator.addScript(new ClassPathResource("data-noten-gu.sql"));
            populator.setContinueOnError(true);
            populator.execute(ds);
            log.info("GU-Tenant-Daten geladen (gradify_noten_gu)");
        } catch (Exception e) {
            log.warn("GU-Daten laden (Noten): {} – prüfe ob gradify_noten_gu existiert", e.getMessage());
        }
    }
}
