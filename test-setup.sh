#!/bin/bash

echo "🧪 Setting up Crate project for testing..."

# Create API environment file for testing
echo "📝 Creating API environment file for testing..."
cat > apps/api/.env << 'EOF'
# Database Configuration (SQLite for testing)
DATABASE_URL="file:./test.db"
DIRECT_URL="file:./test.db"

# Google OAuth Configuration (mock for testing)
GOOGLE_CLIENT_ID="test-client-id"
GOOGLE_CLIENT_SECRET="test-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/auth/google/callback"

# JWT Configuration
JWT_SECRET="test-jwt-secret-key-for-development-only-32-chars"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Redis Configuration (memory mode for testing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=test-password

# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000

# Database Connection Settings
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT=5000
DB_POOL_TIMEOUT=5000
DB_MAX_CONNECTION_LIFETIME=300
DB_MAX_IDLE_LIFETIME=60

# Use memory cache instead of Redis
CACHE_BACKEND=memory

# Disable workers for testing
LOAD_WORKERS=false
EOF

# Create Web environment file
echo "📝 Creating Web environment file..."
cat > apps/web/.env.local << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-nextauth-secret-key
EOF

# Create AI service environment file
echo "📝 Creating AI service environment file..."
cat > ai/.env << 'EOF'
# Environment
ENVIRONMENT=development

# Database Configuration
DATABASE_URL=sqlite:///./test.db

# Message Broker Configuration (mock for testing)
RABBITMQ_URL=amqp://localhost:5672

# Queue Configuration
QUEUE_NAME=email_processing
RESULT_CACHE_TTL=7200
WORKER_PREFETCH_COUNT=10
MAX_RETRIES=3

# ML Model Configuration
MODEL_NAME=paraphrase-MiniLM-L3-v2
MODEL_CACHE_DIR=./models

# AI Similarity Thresholds
CATEGORY_MATCH_THRESHOLD=0.7
THREAD_CONSISTENCY_THRESHOLD=0.5
CONFIDENCE_BOOST=0.2

# Performance Settings
MAX_CATEGORIES_CHECK=1000
CACHE_SIZE=2000
EMBEDDING_CACHE_TTL=7200

# Text Processing Limits
MAX_BODY_CHARS=500
MAX_SUBJECT_CHARS=200

# Database Connection Settings
DB_POOL_SIZE=30
DB_POOL_OVERFLOW=20
DB_POOL_TIMEOUT=30

# Logging Configuration
LOG_LEVEL=INFO
EOF

echo "✅ Test environment files created!"
echo ""
echo "🧪 This setup is configured for testing without external dependencies:"
echo "- Uses SQLite instead of PostgreSQL"
echo "- Uses memory cache instead of Redis"
echo "- Disables background workers"
echo "- Uses mock Google OAuth credentials"
echo ""
echo "📋 To start testing:"
echo "1. Install dependencies: pnpm install"
echo "2. Generate Prisma client: cd apps/api && pnpm db:generate"
echo "3. Push database schema: pnpm db:push"
echo "4. Start the development servers: pnpm dev"
echo ""
echo "🌐 The applications will be available at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:4000"
echo "- API Health: http://localhost:4000/api/health" 