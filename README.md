# 🔍 Uptime Monitor Backend

A backend service for monitoring website uptime, response times, and real-time analytics using **WebSockets**.  
It includes **user authentication**, **two-factor authentication (2FA)**, and **real-time updates** for individual monitors.

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Ayyaz984/backend-monitoring-system.git
cd backend-monitoring-system
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Setup Environment Variables
Create a `.env` file in the root directory.

```env
NODE_ENV=development
PORT=4069
MONGODB_URL=mongodb://127.0.0.1:27017/monitoring
JWT_SECRET=thisisasamplesecret

# Token Expiration
JWT_ACCESS_EXPIRATION_MINUTES=60
JWT_REFRESH_EXPIRATION_DAYS=30
JWT_2FA_TOKEN_EXPIRATION_MINUTES=5
```

### 4️⃣ Seed the Database
```bash
npm run seed
```
> 🧠 Default seeded credentials:
> - Email: `muhammadayyaz984@gmail.com`
> - Password: `Password123`

### 5️⃣ Run the Project
```bash
npm run dev
```

---

## 📬 Postman Collections

Postman collection included:

- **API Collection** → for REST endpoints (authentication, monitors, 2FA, etc.)
- **Socket Collection** → for testing WebSocket endpoints

> 💡 Import API collection in Postman for full testing capability.

### 🧩 How to Use the Socket Collection

- Open Postman → click **New** → select **Socket.IO Request**
- Enter the URL: `http://localhost:4069` (or your server’s port)
- Go to the **Headers** tab and add:
  ```
  authorization: <your_access_token>
  ```
- In the **Message** tab, paste:
  ```json
  { "monitorId": "68e1483540369d25af28657c" }
  ```
  (Replace with your actual monitor ID)
- In the **Events** tab, listen to:
  - `monitor_created`
  - `monitor_analytics`
  - `monitor_updated`
  - `monitor_deleted`
  - `monitor_response`
- To receive analytics for a specific monitor, emit the `join_monitor` event.

---

## 🔐 Authentication & 2FA

### 1️⃣ Login
Use the seeded credentials from the database to log in.

### 2️⃣ Setup 2FA
- Call the **Setup 2FA API** after login.
- It returns a **QR Code URL** — open it in your browser.
- Scan the QR code with the **Google Authenticator app**.

### 3️⃣ Verify 2FA
- Use the **Verify 2FA API**.
- Send the **6-digit code** from your authenticator app.
- Once verified, 2FA will be enabled for your account.

---

## 🔌 Socket Instructions

### ✅ Connect to WebSocket Server
Use the **Socket Collection** in Postman.

> Add your `access_token` in the headers before connecting.

**Example Header:**
```
authorization: <access_token>
```

---

## 🖥️ Real-Time Monitor Updates

You’ll receive real-time events for:
- Monitor creation
- Monitor updates
- Monitor deletions

This is ideal for updating the **dashboard sidebar or list view** dynamically.

---

## 📊 Real-Time Analytics (Chart Data)

To receive real-time analytics for a specific monitor:

1. Go to the **“Messages”** tab in the Postman Socket Collection.
2. Emit the following event:

```json
  { "monitorId": "<your-monitor-id>" }
```
3. You’ll start receiving live analytics data for that monitor (response times, uptime %, etc.) in real time.

## 🧑‍💻 Tech Stack

- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **Socket.IO** for real-time updates
- **JWT Authentication**
- **Google Authenticator (2FA)**
- **Joi** for request validation

---

## 🧪 Testing

✅ Use Postman collections for:
- Authentication & 2FA flow  
- Monitor CRUD operations  
- Real-time updates (via WebSockets)

✅ Test 2FA using **Google Authenticator**  
✅ Verify analytics data updating **in real time**

---

## 📷 Screenshots

Include the following screenshots in your repo’s `/screenshots` folder:

| Feature | Screenshot |
|----------|-------------|
| Postman API Collection | `screenshots/postman-api-collection.png` |
| 2FA QR Code Setup | `screenshots/2fa-qr-code.png` |

---

## 🗣️ Feedback

Have suggestions or found a bug?  
Open an issue or submit a PR — contributions are always welcome!
