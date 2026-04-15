# Inventory Nexus

A role-based Inventory Management System built with **React + TypeScript + Vite**.

## Quick Start

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Head Admin | alex.sterling@nexus.com | admin123 |
| Store Manager | jordan.patel@nexus.com | store123 |
| Store Manager | morgan.lee@nexus.com | store123 |

## Features

### Head Admin
- Full dashboard with metrics (stores, products, low stock, warranty)
- **User Management** — Add, edit, delete users; assign roles & stores; enable/disable
- **Store Management** — Create, edit, delete stores; assign managers
- **Inventory** — Full product CRUD across all stores; search, filter by stock/warranty/store
- Settings & Profile

### Store Manager
- Dashboard showing store-specific metrics
- **Inventory** — Manage products for their assigned store only
- Settings & Profile

## Modules

| Module | Path | Access |
|--------|------|--------|
| Login | `/login` | Public |
| Dashboard | `/dashboard` | All |
| Users | `/users` | Head Admin only |
| Stores | `/stores` | Head Admin only |
| Inventory | `/inventory` | All |
| Settings | `/settings` | All |

## Tech Stack
- React 18
- TypeScript
- React Router v6
- Vite
- Custom CSS (no Tailwind dependency — pure CSS variables)
- Google Fonts: Manrope + Inter
- Material Symbols Outlined icons
