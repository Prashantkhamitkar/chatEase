# Stage 1: Build JAR using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Create uploads directory for media attachments
RUN mkdir -p /app/uploads

ENV SPRING_PROFILES_ACTIVE=prod \
    DATABASE_URL=postgresql://postgres:NzsUamlrMQEycaUibWdfjnqJdYPISCuE@iriguchi.proxy.rlwy.net:46269/railway \
    DATABASE_PUBLIC_URL=postgresql://postgres:NzsUamlrMQEycaUibWdfjnqJdYPISCuE@iriguchi.proxy.rlwy.net:46269/railway \
    PGHOST=iriguchi.proxy.rlwy.net \
    PGPORT=46269 \
    PGDATABASE=railway \
    PGUSER=postgres \
    PGPASSWORD=NzsUamlrMQEycaUibWdfjnqJdYPISCuE \
    JWT_SECRET=f92b9206a9471c9ba0122554f556216f901da6face89b1a8f3aa4616bd1890862d57e5cb \
    FRONTEND_URL=https://gleaming-belekoy-d16620.netlify.app

EXPOSE 9090
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
