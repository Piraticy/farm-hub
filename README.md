# FarmHub Dashboard

Welcome to the FarmHub Dashboard! This project is a simple web application to help you manage your farm operations.

### Features
* Real-time metrics for crops, animals, and employees.
* Quickly add sample data for testing.
* Dark mode for comfortable viewing.

### Getting Started
This is a static site (no build step) living in `pages/`. To preview it locally:
```
cd pages && python3 -m http.server 8080
```

### Hosting
The site auto-deploys on Vercel (free Hobby plan) on every push to `main` — no GitHub Actions or paid CI required.

`firebase.json`/`.firebaserc` are kept for optional manual deploys to Firebase Hosting (`firebase deploy`, run locally), but there's no automated Firebase deploy workflow.

### Live URL
[Your Live URL Here](https://your-project-id.web.app)