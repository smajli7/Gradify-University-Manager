package de.gradify.berechnung.config;

import de.gradify.shared.tenant.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
public class DynamicTenantRoutingDataSource extends AbstractRoutingDataSource {

    private final Map<Object, Object> targetMap = new ConcurrentHashMap<>();
    private final DataSourceFactory dataSourceFactory;

    public DynamicTenantRoutingDataSource(DataSourceFactory dataSourceFactory) {
        this.dataSourceFactory = dataSourceFactory;
    }

    public void init(Map<Object, Object> initialTargets) {
        targetMap.putAll(initialTargets);
        setTargetDataSources(targetMap);
        if (!targetMap.isEmpty()) {
            setDefaultTargetDataSource(targetMap.values().iterator().next());
        }
        afterPropertiesSet();
    }

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.getTenantSuffix();
    }

    @Override
    protected DataSource determineTargetDataSource() {
        String suffix = TenantContext.getTenantSuffix();
        if (suffix == null) {
            return (DataSource) getResolvedDefaultDataSource();
        }
        if (!targetMap.containsKey(suffix)) {
            synchronized (this) {
                if (!targetMap.containsKey(suffix)) {
                    DataSource ds = dataSourceFactory.createForSuffix(suffix);
                    targetMap.put(suffix, ds);
                    setTargetDataSources(targetMap);
                    afterPropertiesSet();
                    log.info("Dynamisch DataSource für Tenant {} hinzugefügt (Berechnung)", suffix);
                }
            }
        }
        return super.determineTargetDataSource();
    }

    @FunctionalInterface
    public interface DataSourceFactory {
        DataSource createForSuffix(String suffix);
    }
}
