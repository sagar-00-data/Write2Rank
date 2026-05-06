# GitHub Upload Guide for AI Answer Checker

## 📋 Files to INCLUDE in Repository (Should be uploaded)

### Essential Project Files
```
.gitignore                    # Git ignore rules (already configured)
package.json                  # Dependencies and scripts
package-lock.json            # Locked dependency versions
tsconfig.json                # TypeScript configuration
next.config.ts               # Next.js configuration
vercel.json                  # Vercel deployment configuration
README.md                    # Project documentation
```

### Source Code
```
src/                         # ALL source code files
├── app/                     # Next.js app router pages
├── components/              # React components
└── (all other src files)
```

### Public Assets
```
public/                      # Static assets
├── file.svg
├── globe.svg
├── next.svg
├── vercel.svg
└── window.svg
```

### Configuration Files
```
eslint.config.mjs           # ESLint configuration
AGENTS.md                   # Agent rules
CLAUDE.md                   # Claude instructions
```

### Documentation
```
plans/                      # Deployment plans
└── deployment-plan.md
```

## 🚫 Files to EXCLUDE from Repository (Should NOT be uploaded)

### Sensitive Files (CRITICAL - Never upload these!)
```
.env.local                  # Contains your actual API keys!
.env.*                      # Any environment file with secrets
google-credentials.json     # Google service account credentials
```

### Build Artifacts & Dependencies
```
node_modules/               # Can be reinstalled with `npm install`
.next/                      # Next.js build output
out/                        # Static export output
build/                      # Production build
*.tsbuildinfo              # TypeScript build info
next-env.d.ts              # Generated TypeScript definitions
```

### Temporary & Log Files
```
.DS_Store                  # macOS system file
*.log                      # Log files (npm, yarn, pnpm)
coverage/                  # Test coverage reports
scratch/                   # Temporary files
Reference/                 # Reference materials
reference/                 # Reference materials
.vercel/                   # Vercel cache
```

### Already in .gitignore
The `.gitignore` file already excludes most of these, but double-check:
- All files listed in the `.gitignore` file above

## 🔧 Step-by-Step GitHub Upload Process

### Step 1: Prepare Your Local Repository
```bash
# Navigate to your project directory
cd "d:/AI Answer Checker"

# Initialize git repository (if not already done)
git init

# Check current status
git status
```

### Step 2: Remove Sensitive Files (IMPORTANT!)
```bash
# Move your .env.local to a safe location (or rename it)
mv .env.local .env.local.backup

# Remove any other sensitive files
rm -f google-credentials.json
```

### Step 3: Create .env.example Template
Create a new file called `.env.example` with placeholder values:
```bash
# .env.example
GEMINI_API_KEY="your_google_gemini_api_key_here"
OCR_SPACE_API_KEY="your_ocr_space_api_key_here"
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
# CLERK_SECRET_KEY="sk_test_..."
```

### Step 4: Stage and Commit Files
```bash
# Add all files (respecting .gitignore)
git add .

# Check what will be committed
git status

# Commit with a message
git commit -m "Initial commit: AI Answer Checker application"
```

### Step 5: Create GitHub Repository
1. Go to https://github.com
2. Click the "+" icon in top right → "New repository"
3. Repository name: `ai-answer-checker`
4. Description: "AI-powered answer sheet evaluation system"
5. Choose Public or Private
6. **DO NOT** initialize with README, .gitignore, or license (you already have these)
7. Click "Create repository"

### Step 6: Connect and Push to GitHub
```bash
# Add remote repository (copy URL from GitHub)
git remote add origin https://github.com/YOUR_USERNAME/ai-answer-checker.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 📁 File Structure Verification

Before pushing, verify your repository structure looks like this:
```
ai-answer-checker/
├── .gitignore
├── .env.example           # NEW: Template file
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── vercel.json
├── eslint.config.mjs
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── GITHUB_UPLOAD_GUIDE.md
├── plans/
│   └── deployment-plan.md
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
└── src/
    ├── app/
    ├── components/
    └── ...
```

## 🔐 Security Checklist

✅ **BEFORE COMMITTING:**
- [ ] `.env.local` is removed/renamed
- [ ] `google-credentials.json` is removed
- [ ] No API keys in any committed files
- [ ] `.env.example` created with placeholders

✅ **AFTER PUSHING:**
- [ ] Set environment variables in deployment platform (Vercel)
- [ ] Keep `.env.local.backup` locally for development
- [ ] Never share actual API keys

## 🚀 Quick Start for New Developers

When someone clones your repository:
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ai-answer-checker.git
cd ai-answer-checker

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with actual API keys
# (Get keys from respective service dashboards)

# Start development server
npm run dev
```

## ⚠️ Common Mistakes to Avoid

1. **Never commit `.env.local`** - It contains your private keys
2. **Don't upload `node_modules/`** - It's huge and can be reinstalled
3. **Check `git status` before committing** - See what files will be included
4. **Use `.gitignore` correctly** - It should exclude build artifacts and secrets

## 🔄 Updating the Repository

For future updates:
```bash
# Make your changes
# Stage files
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

## 📞 Need Help?

- **GitHub Docs**: https://docs.github.com
- **Git Handbook**: https://guides.github.com/introduction/git-handbook/
- **.gitignore Guide**: https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

---

*Last Updated: 2026-05-06*
*For AI Answer Checker Project*