# AI Caller Extension & Backend

Chrome extension (frontend) for scraping contacts from web pages and a Django backend for storing, managing, and integrating AI logic for calls.

---

## 1. Chrome Extension Setup

### Installation
1. Go to `chrome://extensions/` in Chrome.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `chrome_extension` folder from this repo.
4. (Optional) Add your own icons to `chrome_extension/` for branding.

### Usage
- Click the extension icon to open the popup.
- Click **Scan Page** to scrape names, emails, and phone numbers from the current tab.
- Enter a call script in the textarea.
- Click **Initiate Call** to send all found contacts and the script to the backend.
- Click **Clear Data** to remove all scraped contacts from the extension.

---

## 2. Django Backend Setup

### Prerequisites
- Python 3.8+
- pip
- (Recommended) Virtual environment tool (e.g., `venv`)

### Installation
1. Open a terminal and navigate to the project root.
2. Create and activate a virtual environment:
     ```sh
     python -m venv venv
     venv\Scripts\activate
     ```
3. Install dependencies:
   ```sh
   pip install django djangorestframework
   ```
4. Go to the backend directory:
   ```sh
   cd backend
   ```
5. Run migrations:
   ```sh
   python manage.py makemigrations core
   python manage.py migrate
   ```
6. (Optional) Create a superuser for the admin panel:
   ```sh
   python manage.py createsuperuser
   ```
7. Start the development server:
   ```sh
   python manage.py runserver
   ```
   The API will be available at `http://127.0.0.1:8000/api/`

---

## 3. Connecting Extension to Backend
- The extension is pre-configured to send data to `http://127.0.0.1:8000/api/`.
- Make sure the backend server is running before using **Initiate Call** in the extension.
- You can view and manage contacts, call scripts, and logs in the Django admin panel at `http://127.0.0.1:8000/admin/` (login required).

---

## 4. Customization & AI Integration
- You can extend the backend (Django app `core`) to add AI features, such as script generation or call analysis.
- Update the extension or backend URLs as needed for deployment.
---