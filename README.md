# Honkai: Star Rail Auto Check-in Dashboard

A self-hosted, secure dashboard to manage and automate daily check-ins for multiple Honkai: Star Rail accounts on HoYoLAB. Featuring a clean, high-contrast dark theme aligned with the WattVision design system.

## Features

- **Multi-Account Support**: Manage multiple HoYoLAB accounts simultaneously.
- **Automated Daily Check-ins**: Integrates with Vercel Cron to trigger check-ins daily (scheduled at 16:01 UTC / 23:01 WIB).
- **Secure Storage**: Cookies (`ltoken_v2` and `ltuid_v2`) are stored in Supabase encrypted using AES-256-GCM.
- **Detailed History & Calendar**: Track check-in status and monthly rewards in a unified calendar.
- **Responsive Web Design**: Mobile-friendly layout with fluid layout adjustments.

---

## Technical Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Postgres)
- **Security**: AES-256-GCM encryption, HTTP-only JWT cookies, frame/type sniffing protection headers.
- **Cron Engine**: Vercel Cron (Serverless function trigger)

---

## Configuration & Local Setup

### 1. Prerequisites

- **Node.js** (v18.x or newer)
- **Supabase Account** (with a new Postgres project created)

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone <your-repo-url>
cd Hsr-checkin
npm install
```

### 3. Database Schema Setup

In your Supabase project, navigate to the **SQL Editor**, create a new query, and execute the following SQL to set up the necessary tables and indexes:

```sql
-- Table: accounts
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname TEXT NOT NULL,
  ltuid_v2 TEXT NOT NULL,
  ltoken_v2 TEXT NOT NULL,
  auto_checkin BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: checkin_logs
CREATE TABLE checkin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  success BOOLEAN NOT NULL,
  message TEXT,
  reward_name TEXT,
  reward_icon TEXT,
  reward_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for history log optimization
CREATE INDEX idx_logs_account_date ON checkin_logs(account_id, check_date DESC);
```

### 4. Configuration Variables

Create a `.env.local` file in the root directory (refer to `.env.example`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Admin Panel Settings
ADMIN_PASSWORD=your-secure-admin-password
JWT_SECRET=your-jwt-signing-secret

# Encryption (Must be exactly 32-byte hex key / 64 hex characters)
ENCRYPTION_KEY=your-64-character-hex-encryption-key

# Cron Job Secret
CRON_SECRET=your-vercel-cron-secret
```

*Note: You can generate a secure `ENCRYPTION_KEY` using the following terminal command:*

```bash
openssl rand -hex 32
```

### 5. Running the App locally

To compile the webpack cache and start the local Next.js server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How to Extract HoYoLAB Cookies

To automate your check-ins, you must retrieve your account cookies:

1. Open your browser and navigate to the [HoYoLAB Webpage](https://www.hoyolab.com).
2. Log in to your Honkai: Star Rail account.
3. Press `F12` to open Developer Tools, then navigate to the **Application** (or **Storage**) tab -> **Cookies** -> `https://www.hoyolab.com`.
4. Copy the values of the following cookies:
   - `ltoken_v2`
   - `ltuid_v2`
5. **CRITICAL WARNING**: Do NOT click *"Log Out"* on the HoYoLAB website after copying the cookies, as doing so immediately invalidates the tokens on the server. Instead, simply close the browser tab.
6. For adding multiple accounts, use separate browser profiles or open a new Incognito window to avoid cross-session invalidation.

---

## Deployment to Vercel (via Vercel CLI)

To keep your deployment hidden from your GitHub repository (preventing Vercel deployment checks, comments, or environment tags from showing on GitHub), do **not** use the default Vercel-GitHub Git integration. Instead, deploy directly from your local terminal using **Vercel CLI**:

1. Install Vercel CLI globally:

   ```bash
   npm install -g vercel
   ```

2. Log in to your Vercel account:

   ```bash
   vercel login
   ```

3. Initialize and link the project:

   ```bash
   vercel
   ```

   *(Follow the prompts to link to your account/team and configure default settings).*
4. Add all environment variables from `.env.local` to Vercel via the Vercel Dashboard (Settings -> Environment Variables) or via Vercel CLI:

   ```bash
   vercel env add <KEY> <VALUE>
   ```

5. Deploy to production:

   ```bash
   vercel --prod
   ```

Vercel will automatically read [vercel.json](file:///C:/Users/Lenovo/VSC/GitHub/Hsr-checkin/vercel.json) to configure the automated daily cron task:

- Path: `/api/cron`
- Schedule: `16:01 UTC` (`23:01 WIB`)
- Trigger verification: Managed automatically by Vercel using the project's `CRON_SECRET` token.
