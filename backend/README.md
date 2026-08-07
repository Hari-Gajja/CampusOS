# CampusOS — Smart Attendance & Phone Blocking System (Backend)

Production-ready Node.js/Express backend for NFC-based classroom attendance
with automatic phone blocking.

- Teachers create classes with recurring schedules.
- ESP8266 + PN532 readers at classroom doors send card UIDs to `/api/v1/checkin`.
- Students are marked **on-time** or **late** and their phones get an FCM
  **block** push for the duration of the class.
- Teacher dashboard streams live attendance over Socket.IO.
- JWT auth (access + refresh), device API keys, rate limiting, input
  validation, MongoDB transactions for critical writes.

## Tech stack

Node.js 20+ · Express 4 · MongoDB + Mongoose 8 · JWT · Socket.IO ·
Firebase Cloud Messaging · bcrypt · express-validator · Helmet · CORS ·
Morgan · express-rate-limit

## Quick start

```bash
npm install
cp .env.example .env      # then fill in secrets
npm run seed:admin        # creates the admin from ADMIN_* env vars
npm run dev               # or: npm start
```

Requirements:

- MongoDB running locally (or Atlas). **Note:** transactions are used for
  critical operations, which requires a replica set. Atlas uses one by
  default; for local standalone MongoDB the server automatically falls back
  to non-transactional execution (the unique indexes still prevent
  duplicates).
- Optional: a Firebase service account for real push notifications. Without
  it the server runs in mock mode — blocking state is tracked server-side
  and pushes are logged.

## Project structure

```
src/
  config/       # db, firebase
  controllers/  # HTTP handlers
  middlewares/  # auth, device auth, validation, rate limits, errors
  models/       # mongoose schemas
  routes/       # express routers (mounted under /api/v1)
  services/     # business logic (check-in pipeline, sessions, blocking, fcm, socket)
  socket/       # socket.io setup
  utils/        # errors, crypto, time helpers, transactions
  app.js        # express app
  server.js     # bootstrap
```

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets |
| `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` | e.g. `15m` / `7d` |
| `FCM_SERVICE_ACCOUNT_PATH` | Firebase service-account JSON (enables real pushes) |
| `DEVICE_API_KEY_HASH_SECRET` | Pepper for device API key hashing |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `PORT` | HTTP port (default 5000) |

## REST API (all under `/api/v1`)

### Auth
| Method | Path | Access | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | admin | name, email, password, role (`teacher`/`student`), registrationNumber (student), department (teacher) |
| POST | `/auth/login` | public | email, password → `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh-token` | public | refreshToken (rotated) |
| POST | `/auth/logout` | any | — (revokes refresh token) |
| POST | `/auth/change-password` | any | currentPassword, newPassword |

### Users
| Method | Path | Access |
| --- | --- | --- |
| GET | `/users?role=&search=&page=&limit=` | admin/teacher (teacher: students only) |
| GET | `/users/:id` | admin/teacher |
| PUT | `/users/:id` | admin (anyone), teacher (students only) — body: name, email, nfcCardUid, deviceToken, registrationNumber, department |
| DELETE | `/users/:id` | admin |

### Classes
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/classes` | teacher/admin; schedule slots `{dayOfWeek:0-6, startTime:"HH:mm", endTime:"HH:mm"}` |
| GET | `/classes` | teacher: own; admin: all or `?teacherId=` |
| GET | `/classes/:id` | includes enrolled students |
| PUT | `/classes/:id` | update fields/schedule |
| DELETE | `/classes/:id` | also unenrolls everyone |
| POST | `/classes/:id/enroll` | `{ studentIds: [...] }` |

### Sessions & Attendance
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/sessions?date=YYYY-MM-DD` | live on-time/late counts |
| POST | `/sessions/start` | manual start + auto block push; `{ classId, date?, startTime?, endTime? }` |
| POST | `/sessions/end` | `{ sessionId }` → unblock push |
| GET | `/sessions/:id/attendees` | detailed list |
| GET | `/students/:studentId/attendance` | history (self or admin/teacher) |

### NFC Check-in (ESP8266)
```
POST /api/v1/checkin
Headers: x-api-key: <device api key>
Body:    { "nfcUid": "FA5F991A", "deviceId": "dev-3f9c1a2b" }

200: { "success": true, "student": { "name": "...", "regNumber": "..." },
       "status": "on-time" | "late", "lockedUntil": "..." }
4xx/5xx: { "success": false, "message": "..." }
```

Flow: device auth → student by NFC UID → active class (device's assigned
class, then the student's enrollments matching the device room) →
auto-start the session if the current time is inside a schedule slot →
late check (`startTime + lateThresholdMinutes`) → transactional write →
FCM `block` push → `attendance_update` socket event.

### Devices
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/devices/register` | admin; returns `{ deviceId, apiKey }` — plaintext key shown **once** |
| POST | `/devices/heartbeat` | device auth; every 5 min |
| GET | `/devices` | admin |
| PUT | `/devices/:id` | assign class / location / active |
| DELETE | `/devices/:id` | admin |

### Blocking control
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/blocking/start` | teacher/admin; FCM `{type:"block", until}` to all enrolled |
| POST | `/blocking/end` | teacher/admin; FCM `{type:"unblock"}` |
| POST | `/blocking/status` | student app; sync + anti-spoof re-block |

### Reports & Dashboard
| Method | Path |
| --- | --- |
| GET | `/reports/attendance?classId=&from=&to=` |
| GET | `/reports/latecomers?classId=&date=` |
| GET | `/dashboard/teacher` | today's summary + upcoming 7 days |

## Socket.IO

Connect with `{ auth: { token: "<access token>" } }`. Teachers then emit:

```js
socket.emit('join_teacher_room', ['<classId1>', '<classId2>']);
```

Server → client events: `attendance_update`, `session_started`,
`session_ended`, `device_heartbeat` (admins), `rooms_joined` (ack).

## Security notes

- Access tokens expire in 15 min, refresh tokens in 7 days; refresh tokens
  are stored as SHA-256 digests and rotated on every use.
- Device API keys are bcrypt-hashed with a pepper; the plaintext key is
  returned exactly once at registration.
- Rate limiting: 1 check-in/sec per device, 20 auth attempts/15 min/IP,
  1 heartbeat/30 s, 300 req/min/IP general.
- All inputs validated with express-validator; NoSQL injection is not
  possible with Mongoose query builders and searched strings are
  regex-escaped.

## ESP8266 sketch (check-in with retry)

```cpp
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>

// Called after PN532 returns a UID (e.g. "FA5F991A")
bool checkIn(String uid, String deviceId, const String& apiKey) {
  HTTPClient http;
  for (int attempt = 1; attempt <= 3; attempt++) {
    WiFiClientSecure client;
    client.setInsecure(); // or load a CA cert
    http.begin(client, "https://your-backend/api/v1/checkin");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);
    int code = http.POST("{\"nfcUid\":\"" + uid + "\",\"deviceId\":\"" + deviceId + "\"}");
    String body = http.getString();
    http.end();
    if (code == 200) return true;               // success: { success:true, student, status }
    delay(500 * pow(2, attempt));               // exponential backoff
  }
  return false; // show error on OLED
}
```

## Time & timezone convention

All times are **UTC** and ISO 8601. `Session.date` is stored as
`YYYY-MM-DD`; schedule slots are `dayOfWeek` (0=Sunday…6=Saturday) with
`HH:mm` start/end interpreted as UTC. Devices and teachers can display
local time in their UI.
