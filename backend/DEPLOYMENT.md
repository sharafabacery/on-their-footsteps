# 🚀 Deployment Documentation

## Overview

This document provides comprehensive deployment instructions for the Islamic Characters platform backend, covering development, staging, and production environments.

## Deployment Environments

### Environment Types

1. **Development**: Local development environment
2. **Staging**: Pre-production testing environment
3. **Production**: Live production environment

### Environment Comparison

| Feature | Development | Staging | Production |
|---------|-------------|---------|------------|
| Database | Local SQLite | PostgreSQL | PostgreSQL |
| Cache | Optional | Redis | Redis Cluster |
| Logging | DEBUG | INFO | INFO |
| Monitoring | Basic | Full | Full |
| SSL | No | Yes | Yes |
| Domain | localhost | staging.domain.com | api.domain.com |

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB SSD
- Network: 100Mbps

**Recommended Requirements:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- Network: 1Gbps

### Software Dependencies

- **Python**: 3.10 or higher
- **PostgreSQL**: 15.0 or higher
- **Redis**: 7.0 or higher
- **Nginx**: 1.18 or higher (production)
- **Docker**: 20.10 or higher (optional)
- **Git**: 2.30 or higher

## Development Deployment

### Local Development Setup

#### 1. Environment Setup

```bash
# Clone repository
git clone https://github.com/your-username/on-their-footsteps.git
cd on-their-footsteps/backend

# Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Database Setup

```bash
# Option 1: SQLite (for quick development)
export DATABASE_URL="sqlite:///./dev.db"

# Option 2: PostgreSQL (recommended)
# Install PostgreSQL
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Create database
sudo -u postgres createdb on_their_footsteps_dev

# Set database URL
export DATABASE_URL="postgresql://username:password@localhost/on_their_footsteps_dev"
```

#### 3. Environment Configuration

Create `.env` file:
```env
# Development Configuration
DEBUG=true
LOG_LEVEL=DEBUG
DATABASE_URL=sqlite:///./dev.db
SECRET_KEY=dev-secret-key-change-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Optional Redis (for caching)
REDIS_URL=redis://localhost:6379

# Upload Settings
UPLOAD_DIR=./static/uploads
MAX_FILE_SIZE=10485760

# Email (optional)
SMTP_HOST=localhost
SMTP_PORT=1025
```

#### 4. Database Initialization

```bash
# Run migrations
alembic upgrade head

# Or create initial data
python seed_data.py
```

#### 5. Start Development Server

```bash
# Using Python directly
python run.py

# Using uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Using Docker Compose
docker-compose -f docker-compose.dev.yml up
```

#### 6. Verify Deployment

```bash
# Health check
curl http://localhost:8000/api/health

# API documentation
open http://localhost:8000/api/docs
```

### Docker Development

#### Dockerfile.dev

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

#### docker-compose.dev.yml

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - .:/app
      - /app/venv  # Exclude virtual environment
    environment:
      - DEBUG=true
      - DATABASE_URL=postgresql://postgres:password@db:5432/on_their_footsteps_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=on_their_footsteps_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

volumes:
  postgres_dev_data:
  redis_dev_data:
```

## Staging Deployment

### Server Preparation

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3.10 python3.10-venv python3-pip nginx postgresql redis-server

# Create application user
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG sudo appuser
```

#### 2. Application Deployment

```bash
# Switch to application user
sudo su - appuser

# Clone repository
git clone https://github.com/your-username/on-their-footsteps.git
cd on-their-footsteps/backend

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create production environment file
cp .env.example .env.staging
```

#### 3. Environment Configuration

`.env.staging`:
```env
# Staging Configuration
DEBUG=false
LOG_LEVEL=INFO
DATABASE_URL=postgresql://appuser:secure_password@localhost/on_their_footsteps_staging
SECRET_KEY=staging-secret-key-please-change
ALLOWED_ORIGINS=https://staging.on-their-footsteps.com

# Redis Configuration
REDIS_URL=redis://localhost:6379

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/staging.crt
SSL_KEY_PATH=/etc/ssl/private/staging.key

# Upload Settings
UPLOAD_DIR=/var/www/uploads/staging
MAX_FILE_SIZE=10485760

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@on-their-footsteps.com
SMTP_PASSWORD=app_password
```

#### 4. Database Setup

```bash
# Switch to postgres user
sudo su - postgres

# Create database and user
createdb on_their_footsteps_staging
psql -c "CREATE USER appuser WITH PASSWORD 'secure_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE on_their_footsteps_staging TO appuser;"

# Exit back to appuser
exit

# Run migrations
cd /home/appuser/on-their-footsteps/backend
source venv/bin/activate
alembic upgrade head

# Load staging data
python seed_data.py --env=staging
```

#### 5. Systemd Service

Create `/etc/systemd/system/on-their-footsteps-api.service`:

```ini
[Unit]
Description=On Their Footsteps API
After=network.target postgresql.service redis.service

[Service]
Type=exec
User=appuser
Group=appuser
WorkingDirectory=/home/appuser/on-their-footsteps/backend
Environment=PATH=/home/appuser/on-their-footsteps/backend/venv/bin
ExecStart=/home/appuser/on-their-footsteps/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable on-their-footsteps-api
sudo systemctl start on-their-footsteps-api

# Check status
sudo systemctl status on-their-footsteps-api
```

#### 6. Nginx Configuration

Create `/etc/nginx/sites-available/staging.on-their-footsteps.com`:

```nginx
server {
    listen 80;
    server_name staging.on-their-footsteps.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.on-their-footsteps.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/staging.crt;
    ssl_certificate_key /etc/ssl/private/staging.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static Files
    location /static/ {
        alias /var/www/uploads/staging/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health Check
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:8000/api/health;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/staging.on-their-footsteps.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Production Deployment

### High Availability Architecture

```mermaid
graph TD
    A[Load Balancer] --> B[API Server 1]
    A --> C[API Server 2]
    A --> D[API Server 3]
    
    B --> E[Database Primary]
    C --> F[Database Replica 1]
    D --> G[Database Replica 2]
    
    B --> H[Redis Cluster]
    C --> H
    D --> H
    
    B --> I[File Storage]
    C --> I
    D --> I
```

### Production Server Setup

#### 1. Infrastructure Setup

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Production Docker Configuration

`docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  api:
    image: on-their-footsteps/api:latest
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/on_their_footsteps
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=false
      - LOG_LEVEL=INFO
    depends_on:
      - db
      - redis
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=on_their_footsteps
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/ssl
      - static_files:/var/www/static
    depends_on:
      - api
    networks:
      - app-network

  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  static_files:

networks:
  app-network:
    driver: bridge
```

#### 3. Production Environment Variables

`.env.prod`:
```env
# Production Configuration
DB_PASSWORD=your-secure-database-password
SECRET_KEY=your-super-secret-production-key
GRAFANA_PASSWORD=your-grafana-password

# Database
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/on_their_footsteps

# Redis
REDIS_URL=redis://redis:6379

# Application
DEBUG=false
LOG_LEVEL=INFO
ALLOWED_ORIGINS=https://on-their-footsteps.com

# SSL
SSL_CERT_PATH=/etc/ssl/certs/production.crt
SSL_KEY_PATH=/etc/ssl/private/production.key

# Upload
UPLOAD_DIR=/var/www/uploads/production
MAX_FILE_SIZE=10485760

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@on-their-footsteps.com
SMTP_PASSWORD=your-email-password

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3001
```

#### 4. Production Nginx Configuration

`nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    # Upstream Backend
    upstream api_backend {
        least_conn;
        server api:8000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTP to HTTPS Redirect
    server {
        listen 80;
        server_name on-their-footsteps.com www.on-their-footsteps.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name on-their-footsteps.com www.on-their-footsteps.com;

        # SSL Configuration
        ssl_certificate /etc/ssl/certs/production.crt;
        ssl_certificate_key /etc/ssl/private/production.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # Connection pooling
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }

        # Auth Routes (stricter rate limiting)
        location /api/auth/ {
            limit_req zone=auth burst=10 nodelay;
            
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static Files
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options nosniff;
        }

        # Health Check
        location /health {
            access_log off;
            proxy_pass http://api_backend/api/health;
        }

        # Deny access to sensitive files
        location ~ /\. {
            deny all;
        }
    }
}
```

#### 5. Deployment Script

`deploy.sh`:
```bash
#!/bin/bash

set -e

# Configuration
REPO="https://github.com/your-username/on-their-footsteps.git"
BRANCH="main"
DOCKER_REGISTRY="your-registry.com"
IMAGE_TAG="latest"

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin $BRANCH

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $DOCKER_REGISTRY/on-their-footsteps/api:$IMAGE_TAG .
docker push $DOCKER_REGISTRY/on-their-footsteps/api:$IMAGE_TAG

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T api alembic upgrade head

# Deploy new version
echo "🚢 Deploying new version..."
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps api

# Health check
echo "🏥 Performing health check..."
sleep 30

if curl -f http://localhost/api/health; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed. Rolling back..."
    docker-compose -f docker-compose.prod.yml rollback
    exit 1
fi

# Cleanup old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "🎉 Deployment completed successfully!"
```

## Monitoring and Logging

### Application Monitoring

#### Prometheus Configuration

`monitoring/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'on-their-footsteps-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/api/metrics/prometheus'
    scrape_interval: 10s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### Grafana Dashboards

`monitoring/grafana/dashboards/api-dashboard.json`:
```json
{
  "dashboard": {
    "title": "API Performance Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### Log Management

#### Structured Logging

```python
# app/logging_config.py
import structlog
import logging.config

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": structlog.stdlib.ProcessorFormatter,
            "processor": structlog.dev.ConsoleRenderer(colors=False),
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/on-their-footsteps/api.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "formatter": "json",
        },
    },
    "loggers": {
        "": {
            "handlers": ["console", "file"],
            "level": "INFO",
        },
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

## Security Hardening

### SSL/TLS Configuration

```bash
# Generate SSL certificate (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d on-their-footsteps.com -d www.on-their-footsteps.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Headers

```nginx
# Add to nginx configuration
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="on_their_footsteps"

# Create backup
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove old backups (keep last 30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### Recovery

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop API service
docker-compose -f docker-compose.prod.yml stop api

# Restore database
gunzip -c $BACKUP_FILE | docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres -d on_their_footsteps

# Start API service
docker-compose -f docker-compose.prod.yml start api

echo "Database restored from $BACKUP_FILE"
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready -U postgres

# Check logs
docker-compose -f docker-compose.prod.yml logs db

# Restart database
docker-compose -f docker-compose.prod.yml restart db
```

#### API Service Issues

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Restart service
docker-compose -f docker-compose.prod.yml restart api

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Check database queries
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d on_their_footsteps -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check Redis performance
docker-compose -f docker-compose.prod.yml exec redis redis-cli info stats
```

### Health Checks

```bash
# API Health
curl -f http://localhost/api/health

# Database Health
curl -f http://localhost/api/health/database

# Redis Health
curl -f http://localhost/api/health/redis

# Full System Health
curl -f http://localhost/api/health/full
```

## Maintenance

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh

echo "🔧 Starting maintenance tasks..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Clean Docker images
docker system prune -f

# Rotate logs
sudo logrotate -f /etc/logrotate.conf

# Update SSL certificates
sudo certbot renew

# Database maintenance
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d on_their_footsteps -c "VACUUM ANALYZE;"

echo "✅ Maintenance completed"
```

### Update Deployment

```bash
#!/bin/bash
# update.sh

echo "🔄 Starting update process..."

# Backup current version
./backup.sh

# Pull latest code
git pull origin main

# Build and deploy
./deploy.sh

echo "✅ Update completed"
```

This comprehensive deployment documentation ensures reliable, secure, and maintainable deployment of the Islamic Characters platform across all environments.
