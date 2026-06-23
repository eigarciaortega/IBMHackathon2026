# ── Stage 1: Build ──────────────────────────────────────────────────
# Cambiamos a una imagen que YA incluye Maven
FROM maven:3.9.9-eclipse-temurin-21-noble AS build

WORKDIR /app

# Ya no necesitas instalar wget ni Maven manualmente
# El comando mvn funcionará inmediatamente

# Cache de dependencias
COPY pom.xml .
RUN mvn dependency:go-offline -B --no-transfer-progress

# Compilar proyecto
COPY src ./src
RUN mvn clean package -DskipTests -B --no-transfer-progress

# ── Stage 2: Runtime ─────────────────────────────────────────────────
FROM tomcat:jre21-temurin-jammy AS runtime

RUN rm -rf /usr/local/tomcat/webapps/*

COPY --from=build /app/target/neowallet-frontend.war \
     /usr/local/tomcat/webapps/ROOT.war

RUN addgroup -S neowallet && adduser -S neowallet -G neowallet \
    && chown -R neowallet:neowallet /usr/local/tomcat

USER neowallet

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["catalina.sh", "run"]