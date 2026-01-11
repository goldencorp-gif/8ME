
# 8 Miles Estate - Property Management Suite

This is a dual-purpose application. It acts as a modern **SaaS Web Application** (like PropertyMe) and can also be packaged as a **Native Mobile App** for the App Store.

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
