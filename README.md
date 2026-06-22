# YourTube 2.0

A modern YouTube-inspired web application developed as part of the Neo Skillz AI/ML Internship.

## Features

### Core Features
- User authentication using Firebase Google Sign-In
- Video browsing and watching
- Like and Watch Later functionality
- Watch History
- Channel pages
- Search functionality

### Real-Time Features
- Watch Together rooms using Socket.IO
- Real-time room creation and joining

### Premium Features
- Premium subscription page
- Download management
- Download history section

### Additional Features
- Video downloads section
- Responsive UI
- Dark theme interface

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Socket.IO

### Authentication
- Firebase Authentication

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

---

## Local Setup

### Backend

```bash
cd server
npm install
npm start
```

### Frontend

```bash
cd yourtube
npm install
npm run dev
```

Frontend:
http://localhost:3000

Backend:
http://localhost:5000

---

## Environment Variables

### Backend (.env)

```env
DB_URL=your_mongodb_connection_string
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

---

## Deployment

Frontend:
Vercel

Backend:
Render

Database:
MongoDB Atlas

---

## Note

Google Authentication uses Firebase configuration provided during the internship project. Local authentication works correctly. Deployment may require authorized Firebase domains to be added to the Firebase project settings.

---

## Internship Tasks Implemented

- Video download functionality
- Premium subscription system
- Watch Together rooms
- Socket.IO integration
- Download history section
- Real-time communication support

---

## Author

Suren Sankar

SSN College of Engineering

Neo Skillz Internship Project