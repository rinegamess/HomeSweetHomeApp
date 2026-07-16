# Smart Home App - Ubuntu Server Deployment Guide

This application is a full-stack Node.js (Express + React/Vite) application. It can be easily deployed to an Ubuntu server natively with Node.js/PM2, or using Docker.

---

## 🛠️ Step 1: Exporting to GitHub

To get the source code onto your Ubuntu Server, the easiest way is to use the **Settings** menu in **Google AI Studio**:
1. Open the settings menu in AI Studio.
2. Click **Export to GitHub** (or **Download ZIP**).
3. Connect your repository.

---

## 💻 Option A: Native Ubuntu Server Setup (Node.js + PM2)

This method runs the application directly on your server utilizing Node.js and manages it using **PM2** (Process Manager 2) to ensure it restarts automatically on crashes or reboots.

### 1. Connect to your Ubuntu Server via SSH
```bash
ssh user@your-server-ip
```

### 2. Install Node.js (v20 or v22)
We recommend installing Node.js via NodeSource:
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Download and run the NodeSource setup script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify the installation
node -v
npm -v
```

### 3. Clone and Setup the Project
```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd <YOUR_REPO_NAME>

# Install dependencies
npm install
```

### 4. Build the Application
This builds both the React client-side files into `/dist` and compiles the backend server into a single `/dist/server.cjs` file:
```bash
npm run build
```

### 5. Set Environment Variables
Create a `.env` file in the root directory to store your environment variables:
```bash
nano .env
```
Add any required variables, for example:
```env
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=your_gemini_api_key_here
```

### 6. Run with PM2 (Production Manager)
PM2 keeps your server running in the background.
```bash
# Install PM2 globally
sudo npm install -y -g pm2

# Start the application
pm2 start npm --name "smarthome-app" -- run start

# Setup PM2 to start on server boot
pm2 startup
pm2 save
```

Now your application is running on `http://localhost:3000`. You can configure **Nginx** as a reverse proxy to bind it to port 80/443 with an SSL certificate.

---

## 🐳 Option B: Docker Deployment (Recommended for Quick Setup)

Docker allows you to run the application inside a clean, isolated container without manually installing Node.js packages on the host.

### 1. Install Docker on Ubuntu
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
```

### 2. Build the Docker Image
Run this in the root directory of your project:
```bash
sudo docker build -t smarthome-app .
```

### 3. Run the Docker Container
```bash
sudo docker run -d \
  -p 80:3000 \
  --name smarthome-app \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e GEMINI_API_KEY=your_gemini_api_key_here \
  smarthome-app
```
This maps the container's internal port `3000` to port `80` (standard HTTP) of your Ubuntu server. Your application will be live instantly on `http://your-server-ip`!

---

## 🔒 Step 3: Nginx Reverse Proxy & SSL (Optional but Recommended)

If you chose **Option A** (or want a domain with HTTPS/SSL for **Option B**):

### 1. Install Nginx
```bash
sudo apt install -y nginx
```

### 2. Configure Nginx Block
```bash
sudo nano /etc/nginx/sites-available/smarthome
```
Paste this configuration (replace `yourdomain.com` with your IP or domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable configuration and restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/smarthome /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Setup SSL with Certbot (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
