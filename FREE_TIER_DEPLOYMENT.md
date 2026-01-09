# Zero-Cost Deployment Guide (Fully Functional)

You can deploy EventHub completely for **free** using the following "Free Tier" stack. This setup provides a fully functional production-ready application without any monthly charges for small-to-medium usage.

## The Zero-Cost Stack
1.  **Hosting & Backend**: [Vercel](https://vercel.com) (Hobby Plan - Free)
2.  **Database**: [Supabase](https://supabase.com) (Free Tier - 500MB DB)
3.  **Emails**: [Brevo](https://brevo.com) (Free Tier - 300 emails/day)
4.  **Payments**: [Razorpay](https://razorpay.com) (Test Mode - Free)

---

## Step 1: Database Setup (Supabase)
1.  Go to [supabase.com](https://supabase.com) and sign up.
2.  Create a **New Project**.
3.  Once created, go to **Project Settings** -> **Database**.
4.  Copy the **Connection String (URI)**. Select "Transaction Mode" (port 6543) or "Session Mode" (port 5432).
    *   *Tip: Use the Transaction Mode (6543) string for serverless environments like Vercel.*
5.  Save this string; you will need it as `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`.

## Step 2: Email Setup (Brevo)
1.  Go to [brevo.com](https://brevo.com) and sign up for the Free plan.
2.  Go to **SMTP & API** settings keys.
3.  Generate a new **SMTP Key** (not just an API key).
4.  Note down:
    *   **Login Email**: Your account email.
    *   **SMTP Key**: The key you just generated.
    *   **Sender Email**: The email you used to sign up (must be verified).

## Step 3: Payment Gateway (Razorpay)
1.  Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) and sign up.
2.  Switch to **Test Mode** (toggle button at the top).
3.  Go to **Settings** -> **API Keys**.
4.  Generate a **Test Key**.
5.  Note down the `Key ID` and `Key Secret`.

## Step 4: Deploy to Vercel
1.  Push your code to a **GitHub Repository**.
2.  Go to [vercel.com](https://vercel.com) and sign up/login.
3.  Click **Add New...** -> **Project**.
4.  Import your EventHub GitHub repository.
5.  **Environment Variables**: In the deployment screen, copy-paste the sections below into the Environment Variables section.

    **Database (From Supabase)**
    ```env
    POSTGRES_PRISMA_URL="postgres://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
    POSTGRES_URL_NON_POOLING="postgres://postgres.xxxx:password@aws-0-region.pooler.supabase.com:5432/postgres"
    ```

    **Email (From Brevo)**
    ```env
    BREVO_API_KEY="your-smtp-key-from-step-2"
    BREVO_SMTP_LOGIN="your-login-email"
    BREVO_SENDER_EMAIL="your-verified-sender-email"
    BREVO_SENDER_NAME="EventHub Team"
    ```

    **Payments (From Razorpay)**
    ```env
    RAZORPAY_KEY_ID="rzp_test_..."
    RAZORPAY_KEY_SECRET="your-secret"
    NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
    ```

    **App Config**
    ```env
    NEXT_PUBLIC_BASE_URL="https://your-project-name.vercel.app"
    ```
    *(Note: You can update `NEXT_PUBLIC_BASE_URL` after the first deployment once Vercel assigns you a domain)*

6.  Click **Deploy**.

## Step 5: Finalize Database Schema
Once Vercel finishes the build (the first build might fail or succeed depending on build command settings), you need to push your database schema to Supabase.

1.  In your local terminal (Project Root):
    ```bash
    # Create the .env file with the SAME Supabase connection strings
    echo 'POSTGRES_PRISMA_URL="your-supabase-connection-string"' >> .env
    echo 'POSTGRES_URL_NON_POOLING="your-direct-connection-string"' >> .env

    # Push schema
    npx prisma db push
    ```
2.  Now redeploy on Vercel (Go to Deployments -> Redeploy) to ensure the server starts with a ready database.

---
**Congratulations!** You now have a live, fully functional event ticketing system running for $0/month.
