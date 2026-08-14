# دستیار بازی‌گردان جادوگران

داشبورد فارسی و راست‌به‌چپ برای آماده‌سازی و اجرای بازی شرح‌داده‌شده در `GAME.md`.

## اجرا

```bash
npm install
npx vercel dev
```

متغیرهای `.env.example` را در `.env.local` یا تنظیمات پروژهٔ Vercel قرار دهید. یک Blob Store خصوصی به پروژه متصل کنید تا `BLOB_READ_WRITE_TOKEN` ساخته شود.

## بررسی

```bash
npm run lint
npm test
npm run build
```

تمام داده‌های پنهان بازی فقط از Vercel Functions خوانده می‌شوند. تغییرات با شمارهٔ بازبینی و ETag محافظت شده‌اند و نوشتن هم‌زمان قدیمی با پاسخ 409 رد می‌شود.
