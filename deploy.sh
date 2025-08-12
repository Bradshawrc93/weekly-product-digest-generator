#!/bin/bash

# Weekly Report Scheduler Deployment Script
# Usage: ./deploy.sh [platform]

set -e

PLATFORM=${1:-"local"}

echo "🚀 Deploying Weekly Report Scheduler to: $PLATFORM"

case $PLATFORM in
  "local")
    echo "📦 Installing dependencies..."
    npm install
    
    echo "🧪 Testing scheduler..."
    npm run scheduler:test
    
    echo "✅ Local deployment ready!"
    echo "To start the scheduler: npm run scheduler"
    echo "To start in development mode: npm run scheduler:dev"
    ;;
    
  "docker")
    echo "🐳 Building Docker image..."
    docker build -t weekly-report-scheduler .
    
    echo "✅ Docker image built successfully!"
    echo "To run: docker run --env-file .env weekly-report-scheduler"
    ;;
    
  "heroku")
    echo "📋 Creating Procfile for Heroku..."
    echo "worker: npm run scheduler" > Procfile
    
    echo "✅ Heroku deployment ready!"
    echo "To deploy: heroku create && heroku config:set NODE_ENV=production && git push heroku main"
    ;;
    
  "ec2")
    echo "☁️  EC2 deployment instructions:"
    echo "1. Launch EC2 instance with Node.js 18+"
    echo "2. Install PM2: npm install -g pm2"
    echo "3. Clone repository and run: npm install"
    echo "4. Start with PM2: pm2 start src/runScheduler.js --name weekly-report-scheduler"
    echo "5. Save PM2 config: pm2 startup && pm2 save"
    ;;
    
  "cloud-run")
    echo "☁️  Google Cloud Run deployment ready!"
    echo "To deploy: gcloud run deploy weekly-report-scheduler --source ."
    ;;
    
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Available platforms: local, docker, heroku, ec2, cloud-run"
    exit 1
    ;;
esac

echo "🎉 Deployment completed for: $PLATFORM"
