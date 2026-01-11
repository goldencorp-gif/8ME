
# 8 Miles Estate - Property Management Suite

This is a dual-purpose application. It acts as a modern **SaaS Web Application** (like PropertyMe) and can also be packaged as a **Native Mobile App** for the App Store.

---

## 🎨 Custom Branding & Logos

You can customize the application logos without rebuilding the app code.

### How to use Custom Logos
1.  Navigate to the `site-settings.json` file in the root directory (or create it if it doesn't exist).
2.  Update the fields with URLs to your logo images.

**Example `site-settings.json`:**
```json
{
  "footerLogoUrl": "https://your-site.com/logo-footer.png",
  "headerLogoUrl": "https://your-site.com/logo-header.png"
}
```

*   **headerLogoUrl**: Used in the application sidebar and landing page navigation.
*   **footerLogoUrl**: Used in the footer of the landing page.
*   If these fields are left empty (`""`), the default 8ME branding will be used.

---

## 💳 Stripe Payments Integration

This app supports recurring payments using Stripe Payment Links. This allows agencies to subscribe to Starter, Growth, or Enterprise plans directly from the `Settings > Subscription` tab.

### How to Configure Stripe
1.  **Create Payment Links**:
    *   Log in to your Stripe Dashboard.
    *   Create 3 Products: "Starter Plan", "Growth Plan", and "Enterprise Plan" with recurring monthly prices.
    *   For each product, generate a **Payment Link** (e.g., `https://buy.stripe.com/test_...`).
    *   *Optional:* Configure the Redirect URL on success to: `https://your-app-url.com/app/settings?payment_success=true&plan=Growth` (Replace `Growth` with the respective plan name).

2.  **Enable Customer Portal**:
    *   Go to **Stripe Dashboard > Settings > Customer Portal**.
    *   Enable the portal and copy the **Portal Link**.

3.  **Update Config File**:
    *   Open `site-settings.json` (or `public/site-settings.json`).
    *   Paste your links into the `stripe` section:

```json
{
  "stripe": {
    "starterLink": "https://buy.stripe.com/test_...",
    "growthLink": "https://buy.stripe.com/test_...",
    "enterpriseLink": "https://buy.stripe.com/test_...",
    "customerPortalLink": "https://billing.stripe.com/p/login/..."
  }
}
```

The app will now redirect users to these links when they click "Upgrade" or "Switch Plan".

---

## 🚀 Option 1: Run as a Web App (SaaS)
*Best for: Desktop users, Office Admins, and selling subscriptions directly to agencies.*

You do **not** need Capacitor for this. This runs in any browser (Chrome, Safari, Edge).

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```
The app will open at `http://localhost:3000`.

### 3. Deploy to the Web (Going Live)
To sell this software to agencies, you need to host it.

**The Easy Way (Free to start):**
1. Create an account on **Vercel.com** or **Netlify.com**.
2. Connect your GitHub repository.
3. It will deploy automatically to a link like `8miles.vercel.app`.

**Adding a Professional Domain:**
To sell this product, you should buy a domain (e.g., `8milesestate.com`) from Namecheap or GoDaddy (~$12/year).
1. Go to your Vercel/Netlify dashboard -> Settings -> Domains.
2. Enter `8milesestate.com`.
3. Follow the instructions to update your DNS records (CNAME/A Record).
4. Your app is now live at your professional URL!

---

## 📱 Option 2: Build for App Store (iOS & Android)
*Best for: Property Managers on the road, Inspections, and listing on Apple/Google Stores.*

You **do** need Capacitor for this. It wraps your Web App into a native binary (`.ipa` / `.apk`).

### 1. Setup Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init
```

### 2. Build the Web Assets
You must compile the React code first.
```bash
npm run build
```

### 3. Generate Native Projects
```bash
npx cap add ios
npx cap add android
```

### 4. Sync & Open
Every time you change your React code, run this to update the native app:
```bash
npm run build
npx cap sync
```

- **iOS:** `npx cap open ios` (Requires Xcode on Mac)
- **Android:** `npx cap open android` (Requires Android Studio)

---

## ⚠️ Important Security Note
For a production application that you intend to sell:
1.  **API Keys:** Never store `process.env.API_KEY` (Gemini) in the frontend code if you release this publicly. Move the AI logic to a secure Backend API (Node.js/Python).
2.  **Database:** The current app uses `services/db.ts` which simulates a database in the browser. For a real multi-tenant SaaS, replace this file with connections to **Supabase**, **Firebase**, or **PostgreSQL**.
