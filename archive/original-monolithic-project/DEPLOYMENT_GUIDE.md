# Deployment Guide - Storytelling Platform

This guide explains how to deploy the separated frontend and backend projects.

## Project Structure

The application has been split into two independent projects:
- **backend-project/**: Standalone Node.js/Express API server
- **frontend-project/**: Standalone React/Vite frontend application

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Environment variables configured
- Domain names for frontend and backend

## Backend Deployment

### 1. Database Setup

```bash
# Create production database
createdb storytelling_prod

# Navigate to backend project
cd backend-project

# Run database setup scripts
cd DB_SCRIPTS
psql -U postgres -d storytelling_prod -f run-all-ddl.sql
psql -U postgres -d storytelling_prod -f run-all-reference-data.sql
```

### 2. Environment Configuration

```bash
# Copy and configure production environment
cp .env.example .env.production
# Edit .env.production with production values
```

Key production settings:
- `DATABASE_URL`: Production PostgreSQL connection string
- `NODE_ENV=production`
- `SESSION_SECRET`: Strong random secret
- API keys for all external services
- `CORS_ORIGIN`: Frontend production URL

### 3. Build and Deploy

```bash
# Install dependencies
npm install --production

# Build the application
npm run build

# Start production server
npm start
```

### 4. Backend Hosting Options

#### Option A: Traditional VPS (AWS EC2, DigitalOcean, Linode)
```bash
# Use PM2 for process management
npm install -g pm2
pm2 start dist/server.js --name storytelling-api
pm2 save
pm2 startup
```

#### Option B: Container Deployment (Docker)
```dockerfile
# Create Dockerfile in backend-project/
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

#### Option C: Serverless (AWS Lambda, Vercel Functions)
- Requires modifications for serverless environment
- Use serverless framework or Vercel adapter

### 5. Database Hosting
- **Neon**: Serverless PostgreSQL (recommended)
- **AWS RDS**: Managed PostgreSQL
- **DigitalOcean Managed Databases**
- **Supabase**: PostgreSQL with additional features

## Frontend Deployment

### 1. Environment Configuration

```bash
cd frontend-project

# Copy and configure production environment
cp .env.example .env.production
# Edit with production values
```

Key settings:
- `VITE_API_URL`: Backend production URL
- `VITE_STRIPE_PUBLIC_KEY`: Production Stripe key
- Feature flags as needed

### 2. Build for Production

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Preview production build locally
npm run preview
```

### 3. Frontend Hosting Options

#### Option A: Static Hosting (Recommended)

**Vercel:**
```bash
npm i -g vercel
vercel --prod
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**Cloudflare Pages:**
1. Connect GitHub repository
2. Build command: `npm run build`
3. Build output: `dist`

#### Option B: Traditional Web Server

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/storytelling-frontend/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Production Checklist

### Security
- [ ] HTTPS enabled on both frontend and backend
- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled

### Performance
- [ ] Database indexes created
- [ ] Redis cache configured (optional)
- [ ] CDN for static assets
- [ ] Gzip compression enabled
- [ ] Image optimization

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Database backup schedule
- [ ] Log aggregation

### Scaling Considerations

#### Backend Scaling
1. **Horizontal Scaling**: Load balancer + multiple instances
2. **Database**: Read replicas for heavy read operations
3. **Caching**: Redis for session storage and API caching
4. **Queue System**: Bull/RabbitMQ for async jobs

#### Frontend Scaling
1. **CDN**: CloudFlare, Fastly for global distribution
2. **Image Optimization**: Cloudinary, ImageKit
3. **Code Splitting**: Already implemented with Vite
4. **PWA**: Add service worker for offline support

## Environment-Specific Configurations

### Development
```bash
# Backend
cd backend-project
npm run dev

# Frontend (separate terminal)
cd frontend-project
npm run dev
```

### Staging
- Use separate database
- Enable debug logging
- Test integrations with sandbox accounts

### Production
- Disable debug logging
- Enable production error tracking
- Use production API keys
- Enable rate limiting

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify CORS_ORIGIN in backend matches frontend URL
   - Check preflight requests are handled

2. **Database Connection**
   - Verify DATABASE_URL is correct
   - Check firewall rules allow connection
   - Ensure SSL mode matches database requirements

3. **Authentication Issues**
   - Verify session configuration
   - Check cookie settings for cross-domain
   - Ensure OAuth redirect URLs are updated

4. **File Upload Problems**
   - Check upload directory permissions
   - Verify multer configuration
   - Ensure adequate disk space

## Backup and Recovery

### Database Backups
```bash
# Automated daily backups
pg_dump storytelling_prod > backup_$(date +%Y%m%d).sql

# Restore from backup
psql storytelling_prod < backup_20240112.sql
```

### Application Backups
- Git repository for code
- Environment variables in secure vault
- User uploaded files in cloud storage

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review error logs weekly
- Monitor disk usage
- Check SSL certificate expiration
- Database vacuum and analyze

### Update Process
1. Test updates in staging
2. Backup production database
3. Deploy backend first
4. Deploy frontend
5. Run smoke tests
6. Monitor for errors

## Support

For deployment issues:
1. Check logs in both applications
2. Verify environment variables
3. Test API endpoints directly
4. Check browser console for frontend errors

Remember to keep both projects in sync when making API changes!