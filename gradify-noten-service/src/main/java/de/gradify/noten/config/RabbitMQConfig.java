package de.gradify.noten.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ-Konfiguration für den Noten-Service (Producer).
 * 
 * Definiert Exchange, Queues und Bindings für Noten-Events.
 */
@Configuration
public class RabbitMQConfig {

    // Exchange-Name für alle Gradify-Events
    public static final String EXCHANGE_NAME = "gradify.events";
    
    // Queue für Berechnungs-Neuberechnungen
    public static final String QUEUE_BERECHNUNG = "queue.berechnung.neuberechnung";
    
    // Routing Keys für verschiedene Event-Typen
    public static final String ROUTING_KEY_NOTE_CREATED = "note.created";
    public static final String ROUTING_KEY_NOTE_UPDATED = "note.updated";
    public static final String ROUTING_KEY_NOTE_VALIDATED = "note.validated";
    public static final String ROUTING_KEY_NOTE_RELEASED = "note.released";
    public static final String ROUTING_KEY_NOTE_DELETED = "note.deleted";
    
    // Wildcard für alle Noten-Events
    public static final String ROUTING_KEY_NOTE_ALL = "note.*";

    /**
     * Topic Exchange für flexible Routing-Patterns.
     * Topic Exchange erlaubt Wildcards wie "note.*" für alle Noten-Events.
     */
    @Bean
    public TopicExchange gradifyExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    /**
     * Queue für Berechnungs-Service.
     * Hier landen alle Events, die eine Neuberechnung triggern sollen.
     */
    @Bean
    public Queue berechnungQueue() {
        // durable=true: Queue überlebt RabbitMQ-Neustart
        return new Queue(QUEUE_BERECHNUNG, true);
    }

    /**
     * Binding: Alle Noten-Events (note.*) gehen an die Berechnungs-Queue.
     */
    @Bean
    public Binding berechnungBinding(Queue berechnungQueue, TopicExchange gradifyExchange) {
        return BindingBuilder
                .bind(berechnungQueue)
                .to(gradifyExchange)
                .with(ROUTING_KEY_NOTE_ALL);
    }

    /**
     * JSON Message Converter für Serialisierung der Events.
     */
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    /**
     * RabbitTemplate mit JSON-Converter für einfaches Senden von Events.
     */
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
