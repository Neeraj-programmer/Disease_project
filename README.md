# SkinSupport AI Community (MERN)

SkinSupport AI Community is a MERN stack platform focused on safe, trust-based sharing of skin treatment experiences.

## Tech Stack

- MongoDB
- Express.js
- React (JavaScript)
- Node.js
- Socket.io for realtime chat

## Core Safety Features

- Content moderation for promotional and misleading claims
- Mock AI trust scoring and fake-content detection
- Structured outcome-based posting format
- Reporting workflow with admin moderation panel
- Verified user flows (email + optional phone OTP)
- Chat safety filters for promotions/contact sharing
- Mandatory medical disclaimer

## Project Structure

```text
disease project/
  backend/
  frontend/
```

## Local Setup

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:5000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Important

- This project is JavaScript-based (no TypeScript source files).
- Do not commit `.env` or secret files.
- This platform is for sharing personal experiences only and does not provide medical advice.
