# Simple IoT World 🌍📡

A full-stack IoT and Web Application built for **ESP8266 (NodeMCU CP2102)** with **DHT11**, **16x2 I2C LCD**, and an **Actuator LED**, featuring a dashboard deployable on **Render**.

> **Developed with ❤️ by Rohit and Team. Department of ETC, SB Jain, Nagpur**

---

## 📌 Features

### 🖥️ Web Application
- **Tech Stack**: HTML5, Tailwind CSS, Vanilla JavaScript, Node.js, Express.js, JSON File Database (`data/db.json`).
- **Deployable on Render**: Pre-configured with dynamic `PORT`, health check, and `render.yaml`.
- **Page 1: Authentication**:
  - Secure Login & Registration (Name, Email, Password).
  - Default Demo User: `latikesh@example.com` | Password: `123456`.
- **Page 2: Web Dashboard**:
  - **Header**:
    - App Title: **Simple IoT World**
    - Logged-in User: `Welcome <USERNAME>` (e.g. `Welcome LATIKESH`)
    - **ESP8266 Live Online/Offline Status Indicator** with pulsing status badge.
    - **Light / Dark Mode Toggle** (persists preference).
    - Logout button.
  - **Tab 1: Sensor Monitor & Records**:
    - **Section 1**: Current Temperature (°C) & Humidity (%) in large-font metric cards with colorful semi-circular progress gauges, seek bars, and dynamic status badges.
    - **Section 1 (cont)**: Interactive time-series trends graph powered by Chart.js.
    - **Section 2**: Historical records table with pagination (`# | Temperature | Humidity | Time | Date | Action (Delete)`), formatted strictly in **Asia/Kolkata +5:30** timezone.
  - **Tab 2: 16x2 LCD Smart Display**:
    - 2 Input text fields (Field 1: Max 16 chars, Field 2: Max 16 chars).
    - Realistic retro LCD simulation display with live character counters and backlight switch.
    - Save button transmits custom text to ESP8266.
  - **Tab 3: LED Actuator Control**:
    - Innovative 3D tactile push button with neon glow effect to toggle the physical LED ON/OFF.
- **Footer**:
  - `Developed with Love ❤️ by Rohit and Team. Department of ETC, SB Jain, Nagpur`

---

## 🔌 Hardware Wiring Diagram (ESP8266 NodeMCU)

| Component | Component Pin | NodeMCU Pin | GPIO | Description / Notes |
|---|---|---|---|---|
| **DHT11 Sensor** | DATA / OUT | **D5** | GPIO14 | Connect VCC to 3.3V, GND to GND |
| **16x2 I2C LCD** | SCL | **D1** | GPIO5 | I2C Clock (Address: `0x27`) |
| **16x2 I2C LCD** | SDA | **D2** | GPIO4 | I2C Data |
| **16x2 I2C LCD** | VCC & GND | **Vin (5V) & GND** | - | Power supply for LCD backlight |
| **Actuator LED** | Anode (+) | **D3** | GPIO0 | Connect via 220Ω resistor to D3 |
| **Actuator LED** | Cathode (-) | **GND** | GND | Ground return |

---

## 🚀 Running the Web App Locally

1. Open your terminal in this project folder:
   ```bash
   cd c:\Users\Student\promt
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```
5. Log in using:
   - **Email**: `latikesh@example.com`
   - **Password**: `123456`
   *(Or click "Register" to create your own account)*

---

## ☁️ Deploying to Render (Free Web Service)

1. **Push your code to GitHub / GitLab**.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
3. Select your repository.
4. Set the following configuration:
   - **Name**: `simple-iot-world`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.
6. Once deployed, Render will provide a public URL like:
   ```
   https://simple-iot-world.onrender.com
   ```
7. Copy this URL and paste it into the ESP8266 code!

---

## 🛠️ ESP8266 Firmware Setup (Arduino IDE)

### 1. Arduino IDE Setup
1. In Arduino IDE, go to **File > Preferences** and add the ESP8266 Board Manager URL:
   ```
   http://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
2. Go to **Tools > Board > Boards Manager**, search for `esp8266` and install the package.
3. Select Board: **NodeMCU 1.0 (ESP-12E Module)**.
4. Select the COM Port corresponding to your CP2102 driver.

### 2. Install Required Libraries
Go to **Sketch > Include Library > Manage Libraries...** and install:
- `LiquidCrystal I2C` (by Frank de Brabander or Marco Schwartz)
- `DHT sensor library` (by Adafruit) + `Adafruit Unified Sensor`
- `ArduinoJson` (v6 or v7 by Benoit Blanchon)

### 3. Configure and Upload Code
1. Open [`esp8266/esp8266_code.ino`](esp8266/esp8266_code.ino).
2. Configure your WiFi credentials:
   ```cpp
   const char* ssid = "ESP8266";
   const char* password = "12345678";
   ```
3. Add your Render deployment URL:
   ```cpp
   String serverUrl = "https://your-app-name.onrender.com";
   ```
   *(For local testing on same WiFi network, you can use `http://<YOUR_PC_IP>:3000`)*
4. Click **Upload**.

### 4. Hardware Display Workflow
- **During Boot (`setup()`)**:
  - `R1: MyProject` / `R2: WELCOME` (3 seconds)
  - `R1: CONNECTING TO` / `R2: WiFi........`
  - `R1: CONNECTED TO` / `R2: WiFi...SUCCESS`
- **During Operational Loop (`loop()`)**:
  - Transmits Temperature & Humidity to Server every 10 seconds.
  - Fetches latest LCD text and LED state.
  - Displays:
    1. `R1: TEMPERATURE` | `R2: <temp> °C` (2 seconds)
    2. `R1: HUMIDITY` | `R2: <hum> %` (2 seconds)
    3. `R1: SMART DISPLAY` | `R2: <MyData>` (2 seconds)
    4. `R1: LED STATUS` | `R2: <ON/OFF>` (2 seconds)
  - Sets physical LED on Pin D3 to HIGH or LOW.

---

## 🧪 Manual Testing without Hardware

You can test the entire web application before connecting physical hardware:
- Click the **"Simulate Reading"** button on the dashboard to generate realistic sensor readings and test graphs, gauges, and pagination.
- Or use `curl` to test the API directly:
  ```bash
  curl -X POST http://localhost:3000/api/esp/data \
    -H "Content-Type: application/json" \
    -d "{\"temperature\": 36.5, \"humidity\": 52.0}"
  ```
