package de.gradify.studiengang.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ModulZuweisungRequest {
    private final Long dozentId;
    private final Long modulId;

    @JsonCreator
    public ModulZuweisungRequest(
            @JsonProperty("dozentId") Object dozentId,
            @JsonProperty("modulId") Object modulId) {
        this.dozentId = toLong(dozentId);
        this.modulId = toLong(modulId);
    }

    private static Long toLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        if (o instanceof String s) return Long.parseLong(s);
        throw new IllegalArgumentException("Cannot convert to Long: " + o);
    }
}
