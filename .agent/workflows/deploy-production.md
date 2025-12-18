---
description: Deploy BillSnap to production (Vercel + Supabase)
---

# Deploy to Production

This workflow deploys the BillSnap application to production. The application consists of:
- **Frontend**: React/Vite app hosted on Vercel
- **Backend**: Supabase Edge Functions and PostgreSQL database

## Prerequisites

1. Vercel CLI installed and authenticated
2. Supabase CLI installed and authenticated
3. All changes committed to git

## Deployment Steps

### 1. Deploy Frontend to Vercel

// turbo
Build the application:
```bash
npm run build
```

// turbo
Deploy to Vercel (this will automatically deploy if the repo is connected):
```bash
npx vercel --prod
```

Or if using Vercel GitHub integration, simply push to main branch for automatic deployment.

### 2. Deploy Supabase Edge Functions

// turbo
Deploy all Edge Functions to production:
```bash
supabase functions deploy --project-ref jxluygtonamgadqgzgyh
```

To deploy specific functions individually:
```bash
supabase functions deploy bill-analyzer --project-ref jxluygtonamgadqgzgyh
supabase functions deploy ocr-extract --project-ref jxluygtonamgadqgzgyh
supabase functions deploy energy-coach --project-ref jxluygtonamgadqgzgyh
# ... add other critical functions as needed
```

### 3. Deploy Database Migrations (if any)

// turbo
Check for pending migrations:
```bash
supabase migration list --project-ref jxluygtonamgadqgzgyh
```

Deploy migrations:
```bash
supabase db push --project-ref jxluygtonamgadqgzgyh
```

### 4. Verification

After deployment, verify:
- [ ] Frontend is accessible at production URL
- [ ] Bill upload and OCR extraction works
- [ ] AI analysis generates results
- [ ] Offer comparison displays correctly
- [ ] Email functions work (review OTP, welcome emails, etc.)

## Rollback

If issues occur:
- **Frontend**: Redeploy previous version via Vercel dashboard
- **Edge Functions**: Redeploy specific function from previous commit
- **Database**: Use Supabase dashboard to restore from backup

## Notes

- The project reference ID is `jxluygtonamgadqgzgyh`
- Frontend automatically redeploys on push to main (if Vercel GitHub integration is set up)
- Edge Functions must be manually deployed using the Supabase CLI
