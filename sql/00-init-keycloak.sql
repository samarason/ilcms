-- Initialize dedicated database for Keycloak OIDC
SELECT 'CREATE DATABASE keycloak_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO ilcms_user;
