plugins {
    kotlin("jvm") version "1.9.23"
    application
}

group = "com.neowallet"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

// Configurar la versión de Java compatible con Kotlin
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    // Ktor (El motor de nuestros microservicios)
    implementation("io.ktor:ktor-server-core-jvm:2.3.11")
    implementation("io.ktor:ktor-server-netty-jvm:2.3.11")
    implementation("io.ktor:ktor-server-content-negotiation-jvm:2.3.11")
    implementation("io.ktor:ktor-serialization-gson-jvm:2.3.11")

    // Exposed (Para escribir consultas SQL nativas en Kotlin)
    implementation("org.jetbrains.exposed:exposed-core:0.49.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.49.0")
    implementation("org.jetbrains.exposed:exposed-java-time:0.49.0")

    // Controlador de PostgreSQL y Pool de Conexiones
    implementation("org.postgresql:postgresql:42.7.3")
    implementation("com.zaxxer:HikariCP:5.1.0")

    // Sistema de Logs (Requerimiento de Observabilidad)
    implementation("ch.qos.logback:logback-classic:1.4.14")

    // Ktor Client (Para que el Processor se comunique con el Accounts Service)
    implementation("io.ktor:ktor-client-core-jvm:2.3.11")
    implementation("io.ktor:ktor-client-cio-jvm:2.3.11")
    implementation("io.ktor:ktor-client-content-negotiation-jvm:2.3.11")
}

// Le indicamos a Gradle cuál será el archivo principal para ejecutar
application {
    mainClass.set("com.neowallet.MainKt")
}

// Tarea personalizada para ejecutar el Processor Service
tasks.register<JavaExec>("runProcessor") {
    group = "application"
    description = "Runs the Processor Service"
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.neowallet.ProcessorMainKt")
}