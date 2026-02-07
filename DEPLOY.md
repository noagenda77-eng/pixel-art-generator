# Deploying Your Pixel Art Generator

> [!WARNING]
> **This application requires a persistent Node.js Runtime.**
> It uses `node-cron` to schedule tasks and listen for API requests.
> It **CANNOT** be hosted on "Static Site" only plans (like IONOS Deploy Now, GitHub Pages, Vercel Standard, Netlify Standard) unless they specifically offer a "Function" or "Server" runtime.

You have a few options for hosting this Node.js application.

## Option 1: Standard Node.js Hosting (Render, Heroku, Railway, etc.)

This is the easiest way.

1.  **Push to GitHub:**
    -   Create a new repository on GitHub.
    -   Push your code there.
2.  **Connect to Host:**
    -   Sign up for a service like **Render** (render.com) or **Railway** (railway.app).
    -   Create a new "Web Service" and link your GitHub repo.
3.  **Environment Variables:**
    -   In the host's dashboard settings, add your Environment Variable:
        -   `GEMINI_API_KEY`: [Your API Key]
    -   The `PORT` variable is usually handled automatically by these services.
4.  **Build Command:** `npm install`
5.  **Start Command:** `node server.js`

## Option 2: VPS (DigitalOcean, Linode, etc.)

If you are uploading files manually via FTP or using a VPS:

1.  **Prepare Files:**
    -   Upload everything **EXCEPT** `node_modules`.
    -   Upload `package.json`, `server.js`, and the `public/` folder.
2.  **Install Dependencies:**
    -   SSH into your server.
    -   Run `npm install` in the project folder.
3.  **Set Environment Variables:**
    -   You can create a `.env` file on the server with your API key.
4.  **Run with PM2:**
    -   Install PM2: `npm install -g pm2`
    -   Start the app: `pm2 start server.js --name "pixel-art"`
    -   Save process list: `pm2 save`

## Option 4: Google Cloud Platform (Compute Engine)

Since you have a paid account, this is a great, low-cost option (often free with `e2-micro` tier).

**Why Compute Engine?**
Your app saves files locally (`public/gen`). Serverless options (App Engine, Cloud Run) delete these files when they restart. A VM (Compute Engine) keeps them safe.

1.  **Create VM Instance:**
    -   Go to **Compute Engine** > **VM Instances**.
    -   Create new instance.
    -   **Region:** us-east1 or us-central1 (low cost).
    -   **Machine type:** `e2-micro` (2 vCPU, 1 GB memory) - often Free Tier eligible.
    -   **Boot disk:** Debian or Ubuntu is fine.
    -   **Firewall:** Check "Allow HTTP traffic".

2.  **Setup Environment:**
    -   SSH into the VM (click "SSH" button in console).
    -   Install Node.js:
        ```bash
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
        ```
    -   Install Git: `sudo apt-get install -y git`

3.  **Deploy Code:**
    -   Clone your repo: `git clone https://github.com/your-username/your-repo.git`
    -   Go to folder: `cd your-repo`
    -   Install dependencies: `npm install`
    -   Create `.env` file with your API key: `nano .env`

4.  **Run Forever (PM2):**
    -   `sudo npm install -g pm2`
    -   `pm2 start server.js --name "pixel-art"`
    -   `pm2 save`
    -   `pm2 startup` (follow instructions to auto-start on reboot)

5.  **Expose Port 80:**
    -   By default, your app runs on 8080.
    -   You can redirect port 80 to 8080:
        ```bash
        sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
        ```
    -   Or change your code to run on port 80 (requires `sudo`).

---

# How to Update Your App (Routine Maintenance)

When you make changes to the code (e.g., changing the prompt, fixing bugs), follow these steps to deploy the update to your server:

## 1. On Your Computer (Local)
Push your changes to GitHub:
```bash
git add .
git commit -m "Update description"
git push
```

## 2. On Your Server (Remote)
Connect to your server via SSH and run these commands:

1.  **Go to the folder:**
    ```bash
    cd pixel-art-generator
    ```
2.  **Pull the latest code:**
    ```bash
    git pull
    ```
    *(If it asks for username/password, you might need to use a Personal Access Token or set up SSH keys)*

3.  **Install new dependencies (if added):**
    ```bash
    npm install
    ```

4.  **Restart the App:**
    ```bash
    pm2 restart pixel-art
    ```

**That's it!** The server will now be running your new code.
If you changed `server.js` logic (like the prompt), the next generated image will use the new logic.
If you changed `public/script.js` (frontend), users will see it after they refresh their browser.
