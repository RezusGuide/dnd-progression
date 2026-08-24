# Multi-stage build so the final image only carries a JRE + the built jar.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies || true

COPY src ./src
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

# Railway sets $PORT; application.properties already reads it.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
