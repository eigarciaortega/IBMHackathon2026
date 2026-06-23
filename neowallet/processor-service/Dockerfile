FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
LABEL maintainer="NeoWallet Team <dev@neowallet.com>"
LABEL description="NeoWallet Processor Service"

RUN apk add --no-cache wget && \
    addgroup -S neowallet && adduser -S neowallet -G neowallet
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN chown neowallet:neowallet app.jar

USER neowallet
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8081/actuator/health || exit 1

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
