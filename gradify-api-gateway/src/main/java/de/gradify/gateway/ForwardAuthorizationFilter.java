package de.gradify.gateway;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Stellt sicher, dass der Authorization-Header an die Backend-Services
 * weitergeleitet wird (Standardverhalten des Gateways entfernt ihn sonst).
 */
@Component
public class ForwardAuthorizationFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String authorization = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authorization != null && !authorization.isBlank()) {
            ServerWebExchange mutated = exchange.mutate()
                    .request(r -> r.header("Authorization", authorization))
                    .build();
            return chain.filter(mutated);
        }
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
