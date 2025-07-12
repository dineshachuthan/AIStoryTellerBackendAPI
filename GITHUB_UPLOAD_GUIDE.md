# GitHub Upload Guide

Both projects are now ready to be uploaded to GitHub. Follow these steps to create repositories and push your code.

## Step 1: Create GitHub Repositories

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**

### For Backend Project:
- **Repository name**: `storytelling-backend`
- **Description**: "Backend API for collaborative storytelling platform with AI-powered features"
- **Visibility**: Choose Public or Private
- **DO NOT** initialize with README, .gitignore, or license (we already have these)
- Click **"Create repository"**

### For Frontend Project:
- Repeat the above steps with:
- **Repository name**: `storytelling-frontend`
- **Description**: "React frontend for collaborative storytelling platform"

## Step 2: Push Backend Project

After creating the backend repository, GitHub will show you commands. Use these in your terminal:

```bash
cd backend-project

# Add your GitHub repository as remote origin
git remote add origin https://github.com/YOUR_USERNAME/storytelling-backend.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Push Frontend Project

Similarly, for the frontend:

```bash
cd frontend-project

# Add your GitHub repository as remote origin
git remote add origin https://github.com/YOUR_USERNAME/storytelling-frontend.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 4: Verify Upload

1. Refresh your GitHub repository pages
2. You should see all files uploaded
3. Check that the README.md files are displaying correctly

## Step 5: Add Repository Topics (Optional)

On each repository page, click the gear icon next to "About" and add relevant topics:

### Backend Topics:
- nodejs
- express
- postgresql
- drizzle-orm
- typescript
- api
- storytelling
- ai
- elevenlabs
- openai

### Frontend Topics:
- react
- typescript
- vite
- tailwindcss
- storytelling
- frontend
- radix-ui
- tanstack-query

## Step 6: Configure Repository Settings

### For Both Repositories:
1. Go to Settings → General
2. Under "Features", you may want to disable:
   - Wikis (if not needed)
   - Projects (if using external project management)

### Security Recommendations:
1. Go to Settings → Security & analysis
2. Enable:
   - Dependency graph
   - Dependabot alerts
   - Dependabot security updates

## Step 7: Add Secrets for GitHub Actions (Optional)

If you plan to use GitHub Actions for CI/CD:

1. Go to Settings → Secrets and variables → Actions
2. Add necessary secrets:
   - `DATABASE_URL`
   - `API_KEYS` (for various services)
   - `DEPLOY_KEY` (for deployment)

## Step 8: Create Development Branches

For better workflow management:

```bash
# Backend
cd backend-project
git checkout -b develop
git push -u origin develop

# Frontend
cd frontend-project
git checkout -b develop
git push -u origin develop
```

## Step 9: Update Remote URLs in Documentation

After uploading, update any references to repository URLs in your documentation:

1. Update README files with correct GitHub URLs
2. Add badges for build status, license, etc.
3. Update any deployment guides with repository links

## Step 10: Team Collaboration (If Applicable)

If working with a team:
1. Go to Settings → Manage access
2. Click "Invite a collaborator"
3. Add team members by username or email

## Common Issues and Solutions

### Authentication Failed
If you get authentication errors:
```bash
# Use personal access token instead of password
# Create token at: https://github.com/settings/tokens
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/REPO_NAME.git
```

### Large Files Error
If you have files over 100MB:
```bash
# Use Git LFS for large files
git lfs track "*.mp4"
git lfs track "*.zip"
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

### Permission Denied (SSH)
If using SSH and getting permission denied:
```bash
# Check SSH key is added to GitHub
ssh -T git@github.com

# If not, add your SSH key:
# https://github.com/settings/keys
```

## Next Steps

After successful upload:

1. **Documentation**: Consider adding:
   - CONTRIBUTING.md for contribution guidelines
   - CODE_OF_CONDUCT.md for community standards
   - LICENSE file for licensing terms

2. **CI/CD Setup**: Create GitHub Actions workflows for:
   - Automated testing
   - Build verification
   - Deployment pipelines

3. **Project Management**: Set up:
   - Issue templates
   - Pull request templates
   - GitHub Projects for task tracking

4. **Release Management**: 
   - Create initial release tags
   - Set up semantic versioning
   - Configure release automation

## Repository Structure Summary

Your GitHub account will now have:
```
YOUR_GITHUB_USERNAME/
├── storytelling-backend/     # Backend API repository
│   ├── DB_SCRIPTS/          # Database setup scripts
│   ├── package.json         # Node.js dependencies
│   └── README.md            # Backend documentation
│
└── storytelling-frontend/    # Frontend application repository
    ├── src/                 # React source code
    ├── package.json         # Frontend dependencies
    └── README.md            # Frontend documentation
```

Congratulations! Your storytelling platform is now on GitHub! 🎉