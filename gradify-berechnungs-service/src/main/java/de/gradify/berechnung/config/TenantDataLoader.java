package de.gradify.berechnung.config;

import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantSuffixResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;

@Component
@Profile("dev")
@Order(100)
@ConditionalOnProperty(name = "gradify.tenant-routing.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class TenantDataLoader implements CommandLineRunner {

    private final DataSource dataSource;
    private final TenantSuffixResolver tenantSuffixResolver;

    @Override
    public void run(String... args) {
        if (!tenantSuffixResolver.getAllSuffixes().contains("gu")) return;
        try {
            TenantContext.setTenantSuffix("gu");
            ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
            populator.addScript(new ClassPathResource("schema-tenant.sql"));
            populator.setContinueOnError(true);
            populator.execute(dataSource);
            log.info("GU-Schema erstellt (gradify_berechnung_gu)");
        } catch (Exception e) {
            log.warn("GU-Schema (Berechnung): {}", e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }
}
