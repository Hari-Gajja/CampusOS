<<<<<<< HEAD
# CampusOS
=======
# CampusOS — Smart Attendance & Phone Blocking System

Production-ready, role-separated frontend ecosystem and Express/MongoDB backend for NFC-based classroom attendance with automatic FCM phone blocking.

---

## 📁 Repository Structure

```
/CampusOS
├── backend/            # Express.js REST API & Socket.IO server (Port 5000)
├── students/           # Student Portal React App (Port 5173)
├── teachers/           # Faculty / Teacher Portal React App (Port 5174)
├── hods/               # Head of Department (HOD) Portal React App (Port 5175)
└── admin/              # Principal & Admin Console React App (Port 5176)
```

---

## 🚀 Quick Start Guide

### 1. Start the Backend API & Socket Server
```bash
cd backend
npm install
cp .env.example .env     # Configure MONGODB_URI and JWT secrets
npm run seed:admin       # Seeds initial administrator account
npm run dev              # Server starts on http://localhost:5000
```

---

### 2. Run Role Frontend Applications

Each portal can be launched independently:

#### 🎓 Student Portal (`/students`)
```bash
cd students
npm install
npm run dev
```
- **URL**: `http://localhost:5173`
- **Features**: Live class schedule timetable, door check-in attendance log, NFC UID view, device phone block status.

#### 👨‍🏫 Faculty / Teacher Portal (`/teachers`)
```bash
cd teachers
npm install
npm run dev
```
- **URL**: `http://localhost:5174`
- **Features**: Class schedule CRUD & recurring slots editor, multi-student enrollment, real-time Socket.IO check-in stream, manual session start/end with automatic FCM phone blocking, CSV reports, latecomer list, NFC reader device manager.

#### 🏛️ Head of Department Portal (`/hods`)
```bash
cd hods
npm install
npm run dev
```
- **URL**: `http://localhost:5175`
- **Features**: Departmental attendance overview, teacher performance monitoring, live classroom inspector, department CSV reports.

#### 👑 Principal & Admin Console (`/admin`)
```bash
cd admin
npm install
npm run dev
```
- **URL**: `http://localhost:5176`
- **Features**: Roster management (Students, Teachers, HODs, Admins), CSV bulk import, NFC card UID assignment, class allocation, hardware NFC reader registration & 1-time API key generation, system configuration, audit logs, Recharts global analytics.

---

## 🔐 Environment Variables

Each frontend application includes a preconfigured `.env` file:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📡 Hardware & Real-Time Integration
- **ESP8266 + PN532**: Sends card UIDs via `POST /api/v1/checkin` using device API keys.
- **Socket.IO**: Real-time events (`attendance_update`, `session_started`, `session_ended`, `device_heartbeat`) trigger live UI toast notifications and real-time roster updates.
>>>>>>> 2bcacc0 (Initial commit: Complete CampusOS smart attendance & device blocking system with Admin, HOD, Teacher, and Student portals)
