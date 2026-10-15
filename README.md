# CleanMap – Step-by-Step Setup Guide (for beginners)

Take a photo on your phone → the app records your GPS location → pick a tag → it shows up on a map dashboard where you can **assign a cleanup person** and track the case as **Open → In progress → Closed**.

You do **not** need to know how to code. You only need to copy, paste, and click. Plan on about 30–45 minutes the first time.

---

## 0. Before you start

**What you need**
- A computer (Windows, Mac or Chromebook) and your phone
- An email address
- A free text editor: Notepad (Windows) or TextEdit (Mac) works; VS Code is nicer (free at code.visualstudio.com)

**Ask first**
- Check with a parent, teacher or club advisor before you sign up for online accounts. Each service has its own age rules, and an adult may need to create or own the account.
- Use this for a real community project only with permission (school, park authority, neighbourhood group).

**Safety rules for the project**
- Never touch needles, chemicals or broken glass. Photograph from a distance and report it.
- Avoid faces and number plates in photos.
- Hazardous items should be handed to adults or trained cleanup/health workers.

---

## 1. Unzip the project

1. Find `cleanmap.zip` (usually in Downloads).
2. Right-click → **Extract All** (Windows) or double-click (Mac).
3. You should now have a folder called `cleanmap` with these files:

| File | What it does |
|---|---|
| `index.html` | The pages you see (Report + Dashboard) |
| `app.js` | The app's brain (camera, GPS, map, assignments) |
| `config.js` | Where you paste your database address and key |
| `supabase_setup.sql` | Creates your database tables |
| `README.md` | This guide |

---

## 2. Try it on your computer first (demo mode, no accounts)

This confirms the app works before you set up anything online. Data is stored only in your browser.

1. Open the folder in **VS Code**, or open a terminal in the folder:
   - Windows: open the folder, click the address bar, type `cmd`, press Enter.
   - Mac: right-click the folder → **New Terminal at Folder**.
2. Type this and press Enter (needs Python; if it says "not found", skip to step 3, since you can test later on the web):
   ```
   python3 -m http.server 8000
   ```
   (On Windows, if `python3` isn't recognised, try `python -m http.server 8000`.)
3. Open Chrome and go to **http://localhost:8000**
4. The top-right badge should say **Demo mode**. Go to **Dashboard → Load sample data**.
   You'll see a map with red, orange and green dots. On a card, type a name under **Assigned to**, change **Status**, click **Save**.

> Do **not** just double-click `index.html`. The camera and GPS are blocked on files opened that way.

---

## 3. Create your free online database (Supabase)

Supabase stores your reports and photos online so your phone and computer share the same data.

### 3a. Create the account and project
1. Go to **supabase.com** → **Start your project** → sign up (GitHub or email).
2. Click **New project**.
3. Fill in:
   - **Name:** `cleanmap`
   - **Database password:** click *Generate*, then **save it somewhere** (you won't need it for this app, but keep it).
   - **Region:** the one closest to you.
   - Plan: **Free**.
4. Click **Create new project** and wait 1–2 minutes.

### 3b. Create the tables (copy-paste)
1. In the left menu click **SQL Editor** → **New query**.
2. Open `supabase_setup.sql` in your text editor, **select all (Ctrl/Cmd + A) → copy**.
3. Paste into the Supabase editor and click **Run** (bottom right).
4. You should see **Success. No rows returned**.
5. Check: left menu **Table Editor** → you should see `reports` and `tags` (tags already has 8 entries). Left menu **Storage** → a bucket called `photos`.

### 3c. Copy your two secrets (they are fine to put in the app)
1. Left menu → **Project Settings** (gear) → **API** (some versions call it **API Keys** or **Data API**).
2. Copy the **Project URL** (looks like `https://abcdxyz.supabase.co`).
3. Copy the **anon** key (it may be called **anon public** or **Publishable key**; either works).
4. ❌ Do **not** use the `service_role` / `secret` key. That one is a master password.

### 3d. Paste them into the app
1. Open `config.js` in your text editor.
2. Paste between the quote marks:
   ```js
   SUPABASE_URL: "https://abcdxyz.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi...your long key...",
   ```
3. Save the file.
4. (Optional) Test again on `http://localhost:8000`. The badge should now say **Live mode (Supabase)**.

---

## 4. Put it on the internet (free) so your phone can use it

Phones only allow camera + GPS on secure `https://` links, so we host the folder for free.

### Option 1: Netlify (easiest, no coding tools)
1. Go to **app.netlify.com** and sign up (free).
2. Open **app.netlify.com/drop** (or Sites → *Add new site → Deploy manually*).
3. **Drag the whole `cleanmap` folder** onto the page.
4. After a few seconds you get a link like `https://something-random.netlify.app`.
5. Make sure you're **signed in** so the site stays up (anonymous drops can expire). You can rename the site under **Site configuration → Change site name**.

> **Every time you edit a file** (for example `config.js`), drag the folder in again (Deploys → drag the folder onto the deploy box) to update the site.

### Option 2: GitHub Pages
1. Create a free account at **github.com** → **New repository** → name `cleanmap`, set it **Public**.
2. Click **uploading an existing file**, drag in the 5 files, click **Commit changes**.
3. **Settings → Pages →** Source: *Deploy from a branch* → Branch `main` / `/ (root)` → **Save**.
4. After about a minute your site is at `https://YOUR-USERNAME.github.io/cleanmap/`.

---

## 5. Use it on your phone

1. Open your `https://…` link in **Chrome (Android)** or **Safari (iPhone)**.
2. Tap the share/menu icon → **Add to Home Screen**. Now it opens like an app.
3. On the **Report** tab:
   1. Tap **Start camera** → allow camera → point at the problem → **Capture**.
      (If the live preview doesn't work, tap **Use phone camera app**.)
   2. Allow **location** when asked. You should see 📍 with coordinates and accuracy. Tap **Refresh location** if it fails.
   3. Choose a **Tag** (or pick **➕ Add new tag…**).
   4. Describe it in **Description** (e.g. "Broken glass near north gate, jogging path").
   5. Tap **Submit report**.
4. Open the **Dashboard** tab (on the phone or your computer): your report appears as a red dot on the map.

---

## 6. Assign cleanups and track status

On the **Dashboard**, every report card has two controls:

- **Assigned to:** type who will handle it (a person or team, like `Green Club`). Names you've used before show up as suggestions.
- **Status:** `Open` (new, nobody working yet) → `In progress` (someone is on it) → `Closed` (cleaned up / resolved).

Click **Save** after changing either one.

Handy tips:
- If you type a name while the status is Open, saving automatically moves it to **In progress**.
- The top tiles show how many are Open / In progress / Closed and how many **Need an owner**.
- Use the filters (tag, status, person) to see, for example, "everything assigned to Ravi that's still in progress".
- Map colours: 🔴 Open, 🟠 In progress, 🟢 Closed.
- **Export CSV** downloads a spreadsheet of what you're viewing, which is great for a school presentation.

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Badge says **Demo mode** after setup | `config.js` wasn't saved or wasn't re-uploaded. Fill both values, save, then re-deploy (drag the folder to Netlify again). Hard-refresh the page. |
| "new row violates row-level security policy" | The SQL didn't run fully. Re-run `supabase_setup.sql` (it's safe to run again). |
| "Bucket not found" when submitting | Same: re-run the SQL, then check **Storage** shows `photos`. |
| Camera doesn't start | You must use the `https://` link (not a file or plain `http://`). Allow camera in browser settings, or use **Use phone camera app**. |
| Location unavailable | Turn on phone Location Services, allow location for your browser, then tap **Refresh location**. Indoors, accuracy can be poor. |
| Map is grey/blank | Check internet connection; try refreshing. |
| Status/assign won't save | You probably used the *old* SQL. Run the new `supabase_setup.sql` once; it upgrades your existing tables and keeps your data. |
| Can't see old reports after upgrading | Tap **Refresh** on the Dashboard. Old "resolved" cases are shown as "Closed". |
| Supabase project paused | Free projects pause after a period of inactivity. Open the Supabase dashboard and click **Restore**. |

---

## 8. Important: this is a prototype

Right now **anyone who has your link** can add reports and change assignments. That's fine for a class demo; **only share the link with trusted people**. Before using it publicly, you'd add:

1. **Login** (Supabase Auth) so only coordinators can assign and close cases.
2. **Moderation** so spam or inappropriate photos can be removed.
3. **Notifications** (email/WhatsApp) when someone is assigned.
4. **Privacy notice** about photos and locations; a way to delete reports.
5. A **private** photo bucket with signed links if photos shouldn't be public.

## 9. Ideas to level up your project
- "After" photo when closing a case (proof of cleanup)
- Severity levels (low / medium / high) and a heat map
- Leaderboard of volunteers by cases closed
- Offline mode so reports upload when signal returns
- A short presentation: problem → demo → impact → next steps

## How the pieces fit (good for explaining in class)
- **Phone/browser** runs `index.html` + `app.js` (the front end).
- **Supabase Database** stores each report (tag, description, lat/lng, assignee, status).
- **Supabase Storage** keeps the photos.
- **Leaflet + OpenStreetMap** draw the free map.
- **Netlify/GitHub Pages** serve the files over HTTPS.
