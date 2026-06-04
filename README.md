# 🎟️ Ticketing System (Enterprise B2B SaaS)

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

A high-concurrency, distributed B2B ticketing and event management API designed for hyper-local community marketplaces. This platform provides developers and organizations with a robust infrastructure to manage event inventory, process transactions, and receive real-time webhooks, complete with strict Test/Live environment partitioning.

Developed by **Ritesh Singh**.

---

## 🏛️ System Architecture & Core Features

This platform is engineered to handle massive flash-sale traffic spikes and guarantee zero data loss through a decoupled, asynchronous architecture.

* **High-Concurrency Checkout Engine:** Utilizes PostgreSQL ACID-compliant transactions and row-level locking (`SELECT ... FOR UPDATE`) to eliminate race conditions and mathematically prevent overselling during high-traffic ticket drops.
* **Reliability Layer (Asynchronous Webhooks):** Outbound webhooks are decoupled from the main HTTP thread using **RabbitMQ**. Features a Dead Letter Queue (DLQ) with Exponential Backoff (1m, 5m, 1h) to guarantee 100% event delivery even if the client's server experiences downtime. Payloads are secured via HMAC-SHA256 cryptographic signatures.
* **Metered Billing & Rollup Engine:** Implements a low-latency, "fire-and-forget" API tracking middleware using **Redis**. A background Node-cron worker performs hourly batch rollups (`UPSERT`) to PostgreSQL, protecting the primary database from massive write I/O while powering real-time 7-day trailing analytics on the dashboard.
* **Test/Live Data Partitioning (Sandbox):** Features a multi-environment "Data Wall" identical to industry standards. An Express Gatekeeper middleware parses `pk_test_` or `sk_live_` API keys to dynamically route database queries using an `is_live` constraint, ensuring developers can safely test integrations without polluting production revenue or analytics.

---

## 📁 Monorepo Structure

This project is structured as a monorepo, housing both the backend microservices and frontend applications.

```text
ticketing-system/
├── ticketing-engine/        # Node.js/Express API, RabbitMQ Workers, and Cron Jobs
├── ticketing-dashboard/     # React B2B Developer Dashboard (Recharts, Tailwind)
├── ticketing-react/         # Consumer-facing Ticket Purchasing UI
├── .gitignore               # Root ignore rules for Node & React
└── README.md
```

## 🚀 Getting Started (Local Development)

### Prerequisites

Ensure you have the following installed on your local machine:

- **Node.js** (v18+)
- **PostgreSQL**
- **Redis**
- **RabbitMQ** (or **Docker** to run RabbitMQ/Redis containers)

## 1. Clone the Repository

```bash
git clone https://github.com/Ritesh-977/ticketing-system.git
cd ticketing-system
```

## 2. Environment Setup

Navigate to the `ticketing-engine` directory and create a `.env` file:

```env
PORT=5000
DATABASE_URL=postgres://user:password@localhost:5432/ticketing_db
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost
JWT_SECRET=your_super_secret_key
```

## 3. Install Dependencies

Run the following commands in both the backend and frontend directories:

```bash
# Backend
cd ticketing-engine
npm install

# Frontend
cd ../ticketing-dashboard
npm install
```

## 4. Run the Microservices

To fully boot the backend architecture, you need to run the API, the Cron Job, and the RabbitMQ Worker.

```bash
cd ticketing-engine

# Terminal 1: Start the main Express API
npm run dev

# Terminal 2: Start the Webhook Delivery Worker
npm run start:worker

# Terminal 3: Start the Hourly Billing Rollup
npm run start:cron
```

In a separate terminal, start the React developer dashboard:

```bash
cd ticketing-dashboard
npm run dev
```

## 🔐 API Authentication

All programmatic API endpoints require authentication via standard HTTP headers using the API keys generated in your dashboard.

### Public Endpoints
*(e.g., fetching event details)*

Require the **Publishable Key**:

```http
x-publishable-key: pk_live_12345...
```

### Protected Endpoints
*(e.g., creating events, managing inventory)*

Require the **Secret Key**:

```http
Authorization: Bearer sk_live_67890...
```

> Toggle between your **test** and **live** keys to interact with the respective sandbox or production databases.
