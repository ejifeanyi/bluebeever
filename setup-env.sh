#!/bin/bash

echo "🚀 Setting up Crate project environment..."

# Create API environment file
echo "📝 Creating API environment file..."
cat > apps/api/.env << 'EOF'
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/crate_db"
DIRECT_URL="postgresql://postgres:password@localhost:5432/crate_db"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/auth/google/callback"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters-long"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000

# Database Connection Settings
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT=5000
DB_POOL_TIMEOUT=5000
DB_MAX_CONNECTION_LIFETIME=300
DB_MAX_IDLE_LIFETIME=60

# Optional: Load workers for email processing
LOAD_WORKERS=true
EOF

# Create Web environment file
echo "📝 Creating Web environment file..."
cat > apps/web/.env.local << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
EOF

# Create AI service environment file
echo "📝 Creating AI service environment file..."
cat > ai/.env << 'EOF'
# Environment
ENVIRONMENT=development

# Database Configuration
DATABASE_URL=sqlite:///./test.db

# Message Broker Configuration
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

echo "✅ Environment files created!"
echo ""
echo "📋 Next steps:"
echo "1. Update the environment variables in the .env files with your actual values"
echo "2. Install dependencies: pnpm install"
echo "3. Set up your database (PostgreSQL for API, SQLite for AI service)"
echo "4. Run the development servers: pnpm dev"
echo ""
echo "🔧 Required services:"
echo "- PostgreSQL database"
echo "- Redis (for caching and job queues)"
echo "- Google OAuth credentials"
echo ""
echo "📚 For testing without external services, you can:"
echo "- Use SQLite instead of PostgreSQL (update DATABASE_URL)"
echo "- Skip Redis (set CACHE_BACKEND=memory)"
echo "- Use mock Google OAuth for development" 