# Setting Up SSL (HTTPS) on Google Cloud VM

To secure your Pixel Art API (`https://api.yourdomain.com`), you need to:
1.  **Point a Domain** (or Subdomain) to your Google Cloud IP.
2.  **Allow HTTPS** on your Google Cloud Firewall.
3.  **Install Nginx & Certbot** on your server to handle the SSL certificate.

---

## Step 1: Point Your Domain (DNS)

You cannot get a free SSL certificate for a raw IP address (like `104.154...`). You need a domain name.

1.  Log in to your **Domain Registrar** (e.g., IONOS, GoDaddy, Namecheap).
2.  Go to **DNS Settings**.
3.  Add an **A Record**:
    *   **Host/Name:** `pixel` (or just `@` for the main domain)
    *   **Value/Target:** `104.154.81.53` (Your Google Cloud External IP)
    *   **TTL:** Automatic (or 3600)

*Result: You should be able to visit `http://pixel.yourdomain.com` and see your API (once we setup the server).*

---

## Step 2: Allow HTTPS on Google Cloud

1.  Go to **Google Cloud Console** > **Compute Engine** > **VM Instances**.
2.  Click on your instance name.
3.  Click **Edit** (at the top).
4.  Scroll down to **Firewall**.
5.  Check **"Allow HTTPS traffic"**.
6.  Click **Save**.

---

## Step 3: Install Nginx & Certbot

Connect to your server (SSH) and run these commands one by one:

1.  **Install System Packages:**
    ```bash
    sudo apt-get update
    sudo apt-get install -y nginx certbot python3-certbot-nginx
    ```

2.  **Configure Nginx:**
    Create a configuration file for your site:
    ```bash
    sudo nano /etc/nginx/sites-available/pixel-art
    ```
    
    Paste this content (replace `pixel.yourdomain.com` with your actual domain):
    ```nginx
    server {
        listen 80;
        server_name pixel.yourdomain.com;  # <--- CHANGE THIS!

        location / {
            proxy_pass http://localhost:8080; # Points to your Node.js app
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    *(Press Ctrl+O, Enter, Ctrl+X to save and exit)*

3.  **Enable the Site:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/pixel-art /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

4.  **Get the SSL Certificate (The Magic Part):**
    Run this command and follow the prompts:
    ```bash
    sudo certbot --nginx -d pixel.yourdomain.com
    ```
    *(When asked, say "Yes" then enter your email. If asked about redirects, choose "2" for Redirect.)*

---

## Final Step: Update Your Client

Once you have HTTPS working (`https://pixel.yourdomain.com/api/animations` loads in browser without warning), update your `standalone_client.html`:

Change:
`const SERVER_URL = 'http://104.154.81.53:8080';`

To:
`const SERVER_URL = 'https://pixel.yourdomain.com';` (No port needed!)
