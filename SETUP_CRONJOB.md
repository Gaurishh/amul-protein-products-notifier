# 🕒 Setting Up Your Amul Product Scraper Cron Job

Automate product availability checks using [cron-job.org](https://cron-job.org) in just a few steps.

---

## 🔧 Step-by-Step Guide

### ✅ Step 1: Create a Free Account and sign-in.

- Go to [https://cron-job.org](https://cron-job.org)
- Click **"Sign Up"** – No credit card required.
- Sign-in using the credentials.

---

### ➕ Step 2: Create a New Cronjob

- After logging in, click **"Create Cronjob"**
- In the **URL input box**, enter:

```
https://amul-protein-products-notifier-scraper.onrender.com/scrape
```

---

### ⏱ Step 3: Set the Scraping Frequency

**cron-job.org** allows 100 API calls/day on the free tier (~14 minutes between calls). For simplicity, you can:

#### Option 1 (Simple):
- Choose **“Every 15 minutes”** from the dropdown.

#### Option 2 (Optimized):
Use a custom cron expression to avoid queue delays by staggering your timings:

```
3,18,33,48 * * * *
```

> This will trigger at 03, 18, 33, and 48 minutes of every hour.

---

### ⚙️ Step 4: Configure Request Method and Body (**Most Important Step** ⚠️)

- Go to the **“Advanced”** tab
- Set **Request Method** to `POST`
- In the **Request Body**, paste the following **and replace the pincode with your own**:

```json
{
  "pincode": "YOUR_PINCODE_HERE"
}
```

⚠️ **IMPORTANT:** Make sure to replace `"YOUR_PINCODE_HERE"` with the pincode you want to track. For example:

```json
{
  "pincode": "111111"
}
```

---

### 🧾 Step 5: Add Headers

- A pop-up may appear asking to set `Content-Type` — click **“Yes”**
- Or manually add this header:

```
Key: Content-Type
Value: application/json
```

---

## ✅ You're Done!

Your scraper is now live and will check for product availability automatically every 15 minutes 🎉

---

### 📌 Tip:
You can monitor your job status, failures, and execution logs directly on your [cron-job.org dashboard](https://cron-job.org/en/dashboard/)
