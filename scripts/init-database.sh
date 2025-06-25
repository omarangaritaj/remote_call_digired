#!/bin/bash

echo "🗄️ Initializing Database..."

# Create data directory if it doesn't exist
mkdir -p data

# Check if container is running
if docker ps | grep -q gpio-dev; then
    echo "📦 Initializing database inside running container..."

    # Run migrations inside container
    docker exec gpio-dev npx prisma migrate deploy

    # If migrations fail, try to push schema
    if [ $? -ne 0 ]; then
        echo "⚠️ Migrations failed, trying to push schema..."
        docker exec gpio-dev npx prisma db push --accept-data-loss
    fi

    echo "✅ Database initialized in container"
else
    echo "📁 Initializing database locally..."

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi

    # Generate Prisma client
    echo "🔧 Generating Prisma client..."
    npx prisma generate

    # Run migrations
    echo "🗄️ Running migrations..."
    npx prisma migrate deploy

    # If migrations fail, try to push schema
    if [ $? -ne 0 ]; then
        echo "⚠️ Migrations failed, trying to push schema..."
        npx prisma db push --accept-data-loss
    fi

    echo "✅ Database initialized locally"
fi

echo ""
echo "🔍 Database status:"
echo "📂 Database file: $(ls -la data/ 2>/dev/null || echo 'No database file yet')"

if docker ps | grep -q gpio-dev; then
    echo "📊 Tables in database:"
    docker exec gpio-dev npx prisma db execute --stdin <<< ".tables" 2>/dev/null || echo "Could not list tables"
fi

echo ""
echo "✅ Database initialization completed!"
echo "💡 You can now start the application with: ./scripts/build.sh development up"
