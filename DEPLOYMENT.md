# EventHub Deployment Guide

This guide covers the steps to deploy the EventHub application to a production environment.

## 1. Prerequisites

- **Node.js**: Version 18 or higher.
- **PostgreSQL**: A running PostgreSQL database (e.g., Vercel Postgres, Supabase, Neon, or a local instance).
- **Accounts**:
  - **Brevo** for Email services (SMTP keys).
  - **Razorpay** for Payment gateway.
  - **PhonePe** (Optional) for alternative payments.

## 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application Base URL
NEXT_PUBLIC_BASE_URL="https://your-domain.com"

# Database Connection (Prisma)
POSTGRES_PRISMA_URL="postgresql://user:password@host:port/database?sslmode=require"
POSTGRES_URL_NON_POOLING="postgresql://user:password@host:port/database?sslmode=require"

# Brevo (Email Service)
BREVO_API_KEY="your-brevo-api-key"
BREVO_SMTP_LOGIN="your-brevo-smtp-login-email"
BREVO_SENDER_EMAIL="noreply@your-domain.com"
BREVO_SENDER_NAME="EventHub"

# Razorpay (Payments)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your-secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."

# PhonePe (Optional)
PHONEPE_MERCHANT_ID="your-merchant-id"
PHONEPE_SALT_KEY="your-salt-key"
PHONEPE_SALT_INDEX="1"
PHONEPE_HOST_URL="https://api-preprod.phonepe.com/apis/pg-sandbox"
```

## 3. Installation & Build

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Generate Prisma Client**:
    ```bash
    npx prisma generate
    ```

3.  **Database Migration**:
    Push your schema to the database.
    ```bash
    npx prisma db push
    ```

4.  **Build the Application**:
    ```bash
    npm run build
    ```

5.  **Start the Server**:
    ```bash
    npm start
    ```
    The application will run on `http://localhost:3000` (or `PORT` env if set).

## 4. Deploying to Vercel (Recommended)

1.  Push your code to a GitHub repository.
2.  Import the project into Vercel.
3.  Vercel will detect Next.js.
4.  Add the **Environment Variables** in the Vercel Project Settings.
5.  **Database**: You can use Vercel Postgres storage directly, which automatically sets the `POSTGRES_...` variables.
6.  Click **Deploy**.

## 5. Persistent Storage Note

Since this application uses some in-memory storage fallback for demo purposes or strictly client-side `localStorage` (like Team Members currently), ensure you have a proper database connected for production use to persist:
- Team Members
- Tickets
- Events

*Note: The current implementation includes fallbacks to memory/local storage, but a real database connection is strongly recommended for production stability.*
