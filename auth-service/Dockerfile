# Imagen base mínima Java 21
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# Copiamos solo los archivos de Maven para cachear dependencias
COPY pom.xml .
COPY src ./src

# Compilamos
RUN ./mvnw -B -DskipTests clean package

# Imagen runtime (solo jar)
FROM eclipse-temurin:21-jdk-alpine
ARG JAR_FILE=target/*.jar
COPY --from=build /app/${JAR_FILE} app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]
