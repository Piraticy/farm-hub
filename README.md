# FarmHub Dashboard

Welcome to the FarmHub Dashboard! This project is a simple web application to help you manage your farm operations.

### Features
* Manage crops, animals, employees, inventory, and finances.
* Dark mode for comfortable viewing.
* No backend, no accounts, no cost — data is saved in your browser's local storage.
* Sign in as Admin (no password yet) or as an individual staff member. Admin can grant each staff member access to specific sections from the Employees page; staff only see what they've been granted.
  **This is a placeholder access model, not real security** — there's no backend or password, so anyone with access to this browser's storage can bypass it. Don't rely on it to protect sensitive data.

### Getting Started
This is a static site (no build step, no backend) living in `pages/`. To preview it locally:
```
cd pages && python3 -m http.server 8080
```

### Hosting
The site auto-deploys on Vercel (free Hobby plan) on every push to `main` — no GitHub Actions, no server, no paid services required.

### Live URL
[farm-hub-blush.vercel.app](https://farm-hub-blush.vercel.app)
