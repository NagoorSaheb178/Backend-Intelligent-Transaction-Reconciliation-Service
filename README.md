# KoinX 📊

<div style="background: linear-gradient(135deg, #ff7e5f, #feb47b); padding: 10px; border-radius: 8px; color: white; text-align: center; font-family: 'Inter', sans-serif;">
  <h1 style="margin: 0; font-size: 2.5rem;">KoinX – Intelligent Transaction Reconciliation Service</h1>
  <p style="margin: 0; font-size: 1.1rem;">A high‑performance Node.js service that matches, ingests, and reconciles financial transactions with modern APIs and micro‑services architecture.</p>
</div>

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview
KoinX provides a set of RESTful endpoints for ingesting transaction data, performing fuzzy matching, and generating reconciliation reports. It is built with **Express**, **Mongoose**, and **Swagger** for API documentation. The service is container‑ready and includes a Dockerfile for seamless deployment.

## Features
- **Fast matching engine** using optimized regex & fuzzy algorithms.
- **Swagger UI** for interactive API exploration (`/api-docs`).
- **Docker support** – run anywhere with a single command.
- **Extensible architecture** – plug in additional data sources or matching strategies.
- **Robust logging** with Winston and environment‑specific configurations.

## Getting Started
```bash
# Clone the repository
git clone <repository-url>
cd koinx

# Install dependencies
npm install

# Set up environment variables (copy from .env.example)
cp .env.example .env
# Edit .env as needed
```

## Running the Application
```bash
# Development mode (hot reload)
npm run dev
```
The server will start on **`http://localhost:3000`** (or the port defined in `.env`). Visit **`http://localhost:3000/api-docs`** to view the Swagger UI.

## Project Structure
```
├─ src
│  ├─ config          # Configuration (logger, swagger)
│  ├─ constants       # Constants used across services
│  ├─ controllers     # Express route handlers
│  ├─ middleware      # Custom middleware (auth, error handling)
│  ├─ models          # Mongoose schemas
│  ├─ services        # Business logic (matching, ingestion)
│  └─ utils           # Helper utilities
├─ Dockerfile          # Container build definition
├─ package.json        # NPM scripts & dependencies
└─ README.md           # ★ This file
```

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repo and create a feature branch.
2. Run `npm run lint` and ensure all tests pass.
3. Open a Pull Request with a clear description of changes.
4. Follow the existing coding style (Prettier configured in `.prettierrc`).

## License
This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
