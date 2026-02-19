package de.gradify.user.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DemoUserItem {
    private String username;
    private String rolle;
    private String label;
    private Long mandantId;
}
