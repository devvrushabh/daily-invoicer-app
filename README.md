# Daily Invoicer Android Application

[![Android Build CI/CD](https://github.com/devvrushabh/daily-invoicer-app/actions/workflows/android.yml/badge.svg)](https://github.com/devvrushabh/daily-invoicer-app/actions/workflows/android.yml)

A modern, high-performance Android application for daily invoice generation, management, PDF export, and payment gateway integration.

---

## 🚀 Features

- **Invoice Creation & Tracking**: Easily create and manage client invoices.
- **PDF Export**: Instant PDF generation and exporting (`pdf-exporter.js`).
- **Payment Gateway Integration**: Multi-gateway payment handling (`payment-gateways.js`).
- **Email Service**: Send invoices directly to clients (`email-service.js`).
- **Automated CI/CD**: Automatic APK build and artifact packaging on every push.

---

## 🛠 Tech Stack

- **Android Platform**: Kotlin, WebView / Native integration.
- **Frontend / Assets**: HTML5, Modern CSS (`mobile.css`), JavaScript ES6 modules.
- **Build System**: Gradle with Kotlin DSL (`build.gradle.kts`).
- **CI/CD Pipeline**: GitHub Actions (`.github/workflows/android.yml`).

---

## 📦 Building & Development

### In Android Studio
1. Clone repository:
   ```bash
   git clone https://github.com/devvrushabh/daily-invoicer-app.git
   ```
2. Open project in **Android Studio**.
3. Sync Gradle project files.
4. Click **Run** or press `Shift + F10`.

### Building via Command Line
```bash
./gradlew assembleDebug
```
The compiled APK will be at `app/build/outputs/apk/debug/app-debug.apk`.

---

## 🔄 Continuous Integration & Deployment (CI/CD)

Whenever changes are pushed to `main` or a version release tag (e.g. `v1.0.0`) is created:
1. GitHub Actions triggers automatically.
2. The project compiles `assembleDebug` and `assembleRelease`.
3. Downloadable APK artifacts are attached to the Action run.
4. Official releases are automatically published under GitHub Releases when tagged.
