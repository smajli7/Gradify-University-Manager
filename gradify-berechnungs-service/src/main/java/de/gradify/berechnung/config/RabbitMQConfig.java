package de.gradify.berechnung.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ-Konfiguration für den Berechnungs-Service (Consumer).
 * 
 * Empfängt Noten-Events und triggert automatische Neuberechnungen.
 */
@Configuration
public class RabbitMQConfig {

    // Exchange-Name (muss mit Noten-Service übereinstimmen)
    public static final String EXCHANGE_NAME = "gradify.events";
    
    // Queue für Berechnungs-Neuberechnungen
    public static final String QUEUE_BERECHNUNG = "queue.berechnung.neuberechnung";
    
    // Routing Key für alle Noten-Events
    public static final String ROUTING_KEY_NOTE_ALL = "note.*";

    /**
     * Topic Exchange (muss identisch zum Producer sein).
     */
    @Bean
    public TopicExchange gradifyExchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    /**
     * Queue für eingehende Noten-Events.
     */
    @Bean
    public Queue berechnungQueue() {
        return new Queue(QUEUE_BERECHNUNG, true);
    }

    /**
     * Binding: Verbindet Queue mit Exchange.
     */
    @Bean
    public Binding berechnungBinding(Queue berechnungQueue, TopicExchange gradifyExchange) {
        return BindingBuilder
                .bind(berechnungQueue)
                .to(gradifyExchange)
                .with(ROUTING_KEY_NOTE_ALL);
    }

    /**
     * JSON Message Converter für Deserialisierung der Events.
     */
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    /**
     * Listener Container Factory mit JSON-Converter.
     */
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jsonMessageConverter());
        // Bei Fehler: Message wird erneut versucht
        factory.setDefaultRequeueRejected(true);
        return factory;
    }
}
