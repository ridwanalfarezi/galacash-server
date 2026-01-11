# Environment Configuration Guide

## Overview

This project uses environment-specific configuration files for different deployment scenarios:

- **`.env.development`** → Local development with Docker
- **`.env.production`** → GCP Cloud Run production deployment
- **`.env.example`** → Template with all available options
- **`.env`** → Active configuration (gitignored, created by you)

## Quick Start

### Development Setup

```bash
# Copy development config
cp .env.development .env

# Start dependencies
docker-compose up -d

# Run database migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

### Production Deployment (GCP Cloud Run)

See [`.env.production`](./.env.production) for detailed Cloud Run deployment instructions.

## Environment Variables Reference

### Application

| Variable    | Description       | Dev Default   | Prod Default            |
| ----------- | ----------------- | ------------- | ----------------------- |
| `NODE_ENV`  | Environment mode  | `development` | `production`            |
| `PORT`      | Server port       | `3000`        | `8080` (Cloud Run auto) |
| `LOG_LEVEL` | Logging verbosity | `debug`       | `info`                  |

### Database (PostgreSQL)

| Variable       | Description       | Example                                                                                      |
| -------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Connection string | Local: `postgresql://user:pass@localhost:5433/db`                                            |
|                |                   | Cloud SQL: `postgresql://user:pass@localhost:5432/db?host=/cloudsql/project:region:instance` |

**Production:** Use Secret Manager for `DATABASE_URL`

### Cache (Redis)

| Variable    | Description      | Example                              |
| ----------- | ---------------- | ------------------------------------ |
| `REDIS_URL` | Redis connection | Local: `redis://localhost:6379`      |
|             |                  | Memorystore: `redis://10.x.x.x:6379` |

### Authentication (JWT)

| Variable             | Description          | Generation                |
| -------------------- | -------------------- | ------------------------- |
| `JWT_SECRET`         | Access token secret  | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `openssl rand -base64 64` |

**Production:** ALWAYS use Secret Manager

### GCP Cloud Storage

| Variable                         | Description              | Required                      |
| -------------------------------- | ------------------------ | ----------------------------- |
| `GCP_PROJECT_ID`                 | GCP project ID           | Yes (prod), Optional (dev)    |
| `GCP_BUCKET_NAME`                | Storage bucket name      | Yes                           |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service account key path | Dev only (Cloud Run uses ADC) |

### Scheduled Jobs

| Variable                   | Description            | Format                    |
| -------------------------- | ---------------------- | ------------------------- |
| `BILL_GENERATION_SCHEDULE` | Cron for monthly bills | `0 2 1 * *` (2 AM on 1st) |

### CORS

| Variable      | Description     | Example                                   |
| ------------- | --------------- | ----------------------------------------- |
| `CORS_ORIGIN` | Allowed origins | Dev: `*`, Prod: `https://app.example.com` |

## Security Best Practices

### Development

- ✅ Use development-specific weak secrets (already in `.env.development`)
- ✅ Allow all CORS origins (`*`)
- ✅ Enable debug logging

### Production

- 🔒 **NEVER** commit production `.env` files
- 🔒 Store all secrets in GCP Secret Manager
- 🔒 Restrict CORS to specific frontend domain
- 🔒 Use Cloud SQL with Unix sockets
- 🔒 Enable VPC connectors for private resources
- 🔒 Rotate secrets regularly
- 🔒 Use IAM roles, not service account keys

## GCP Cloud Run Deployment

### Prerequisites

```bash
# Enable required APIs
gcloud services enable run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  vpcaccess.googleapis.com
```

### Create Secrets

```bash
# JWT secrets
echo -n "$(openssl rand -base64 64)" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "$(openssl rand -base64 64)" | gcloud secrets create JWT_REFRESH_SECRET --data-file=-

# Database URL (or just password)
echo -n "postgresql://appuser:STRONG_PASS@localhost:5432/galacash?host=/cloudsql/PROJECT:REGION:INSTANCE" \
  | gcloud secrets create DATABASE_URL --data-file=-

# CORS origin
echo -n "https://your-frontend.com" | gcloud secrets create CORS_ORIGIN --data-file=-
```

### Deploy

```bash
gcloud run deploy galacash-api \
  --image=asia-southeast2-docker.pkg.dev/PROJECT/galacash/api:latest \
  --region=asia-southeast2 \
  --platform=managed \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=50 \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=PROJECT_ID,GCP_BUCKET_NAME=galacash-uploads-prod" \
  --set-secrets="JWT_SECRET=JWT_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,DATABASE_URL=DATABASE_URL:latest,CORS_ORIGIN=CORS_ORIGIN:latest" \
  --add-cloudsql-instances="PROJECT:REGION:galacash-sql" \
  --vpc-connector="galacash-vpc-connector"
```

## Troubleshooting

### Local Development

**Database connection fails:**

```bash
# Check Docker containers
docker-compose ps

# Restart services
docker-compose restart postgres redis
```

**File uploads disabled:**

- Leave `GCP_PROJECT_ID` empty in development
- Or configure a development GCS bucket

### Production

**Cloud SQL connection issues:**

- Verify `--add-cloudsql-instances` matches your instance
- Check DATABASE_URL format uses `/cloudsql/` socket path
- Ensure service account has Cloud SQL Client role

**Memorystore (Redis) not accessible:**

- Verify VPC connector is attached to Cloud Run service
- Check Memorystore IP is correct (use private IP)
- Ensure VPC connector is in same network as Memorystore

**Secrets not loading:**

- Verify Secret Manager API is enabled
- Check service account has Secret Manager Secret Accessor role
- Ensure secret names match exactly (case-sensitive)

## Migration Between Environments

### From Development to Production

1. Test locally with production-like settings:

   ```bash
   NODE_ENV=production pnpm build
   NODE_ENV=production node dist/index.js
   ```

2. Run database migrations on production:

   ```bash
   # Using Cloud SQL proxy
   cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432 &
   DATABASE_URL="postgresql://user:pass@localhost:5432/galacash" pnpm prisma migrate deploy
   ```

3. Deploy to Cloud Run (see above)

### Rolling Back

```bash
# Deploy previous revision
gcloud run services update-traffic galacash-api \
  --to-revisions=galacash-api-00005-xyz=100 \
  --region=asia-southeast2
```

## Environment File Priority

Node.js loads environment variables in this order (last wins):

1. System environment variables
2. `.env` file (your local copy)
3. Cloud Run environment variables
4. Cloud Run mounted secrets

**Recommendation:** Use Cloud Run env vars + Secret Manager in production; ignore `.env` in containers.
