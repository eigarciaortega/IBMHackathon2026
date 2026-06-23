# ══════════════════════════════════════════════════════════════════════
# NeoWallet Frontend — Dockerfile
# Stage 1: Build con Maven 3.9 + JDK 21
# Stage 2: Runtime con Tomcat 10.1 + JRE 21
# ══════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ──────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-noble

WORKDIR /app

# Cache de dependencias Maven
COPY pom.xml .
RUN mvn dependency:go-offline -B --no-transfer-progress

# Compilar proyecto
COPY src ./src
RUN mvn clean package -DskipTests -B --no-transfer-progress

# ── Stage 2: Runtime ─────────────────────────────────────────────────
FROM tomcat:10.1-jre21-alpine AS runtime

# Eliminar webapps por defecto
RUN rm -rf /usr/local/tomcat/webapps/*

# Copiar WAR como ROOT (acceso desde /)
COPY --from=build /app/target/neowallet-frontend.war \
     /usr/local/tomcat/webapps/ROOT.war

# Usuario no-root por seguridad (OWASP)
RUN addgroup -S neowallet && adduser -S neowallet -G neowallet \
    && chown -R neowallet:neowallet /usr/local/tomcat

USER neowallet

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["catalina.sh", "run"]
