package com.neowallet.processor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * NeoWallet - Processor Service
 * Microservicio responsable del procesamiento de transferencias P2P.
 * Implementa el patrón Saga con compensación para garantizar consistencia de datos.
 */
@SpringBootApplication
public class ProcessorServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProcessorServiceApplication.class, args);
    }
}
