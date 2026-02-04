package de.gradify.user.config;

import de.gradify.shared.tenant.TenantContext;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Routing-DataSource für DB-per-Tenant im User-Service.
 */
public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenantSuffix();
    }
}
