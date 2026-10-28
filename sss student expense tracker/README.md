# CampusCash — Student Expense Tracker

CampusCash is a beginner-friendly full-stack expense tracker designed for college students. Record everyday spending, group it by category, search and sort transactions, and set a monthly budget.

## Features

- Responsive dashboard with monthly spend, budget, remaining amount, and transaction count.
- Create, read, update, and delete expense records using a real REST API.
- Categories, dates, notes, search, category filter, and sorting.
- Monthly budget saved in PostgreSQL through Supabase.
- Client- and server-side validation, loading states, empty states, and clear error messages.
- Supabase credentials stay in the backend environment file; the frontend only calls the Express API.
- RLS is enabled in the supplied schema; the demo policies are intentionally permissive for a no-login classroom project (read the security note below).

## Technology stack

- Frontend: HTML, CSS, vanilla JavaScript, Fetch API
- Backend: Node.js, Express.js, CORS, dotenv
- Database: Supabase PostgreSQL
- Version control: Git and GitHub

## Project layout

```text
student-expense-tracker/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## Prerequisites

Install Node.js LTS (includes npm), a code editor such as VS Code, and create a free Supabase project. Git is needed if you plan to submit to GitHub.

## 1. Create and configure Supabase

1. Sign in to [Supabase](https://supabase.com/) and create a new project.
2. Open **SQL Editor** in your project.
3. Open `database/schema.sql` from this project, copy the complete contents, paste into the SQL Editor, and run it.
4. Open **Project Settings → API** (or the API keys section in the current dashboard). Copy the Project URL and the anon/public key. Do not use a service-role/secret key.
5. Keep the project available while running the app. The backend must be able to reach Supabase.

The schema creates `expenses` and `monthly_budget`, indexes, timestamp triggers, constraints, and RLS policies.

## 2. Configure the backend

Open a terminal in the project folder, then run these commands **inside the `backend` directory**:

```bash
cd backend
npm install
npm install express cors dotenv @supabase/supabase-js ws
npm install --save-dev nodemon
```

The first `npm install` installs all dependencies declared in `package.json`. The two additional install commands are included for clarity only; they are not required for a correctly configured project.

Copy `backend/.env.example` to `backend/.env` and fill in the real values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
APP_TIME_ZONE=Asia/Kolkata
```

On Windows PowerShell, while in the project root:

```powershell
Copy-Item backend/.env.example backend/.env
```

Then edit `backend/.env` in VS Code. Never commit `.env`. The included `.gitignore` excludes it.

## 3. Start the backend

In a terminal:

```bash
cd backend
npm install
npm run dev
```

Or use `npm start` for the normal start script. Expected log: `CampusCash API listening at http://localhost:3000`. If your environment variables are filled in, it should report `database configured: true`.

Check the health endpoint in a browser: [http://localhost:3000/api/health](http://localhost:3000/api/health). It reports whether the URL and anon key are present; this alone does not prove the database connection works.

## 4. Start the frontend

Use VS Code's **Live Server** extension to open `frontend/index.html`. Typical URLs are `http://127.0.0.1:5500` or `http://localhost:5500`, which are allowed by the default CORS configuration. If you use a different port, add that exact origin to `FRONTEND_ORIGIN` in `backend/.env`, then restart the backend.

You can also use another static HTTP server. Avoid opening the page as a `file://` URL because browser origin and CORS behavior can vary.

## API endpoints

All endpoints use `http://localhost:3000/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API status and whether env config is present |
| GET | `/expenses` | List expenses (optional `?category=Food`) |
| POST | `/expenses` | Create an expense |
| PUT | `/expenses/:id` | Update an expense by UUID |
| DELETE | `/expenses/:id` | Delete an expense by UUID |
| GET | `/budget` | Read the monthly budget |
| PUT | `/budget` | Save the monthly budget |

Example create request:

```json
{
  "title": "Lunch with friends",
  "amount": 180,
  "category": "Food",
  "date": "2026-10-28",
  "note": "Campus cafe"
}
```

Example with PowerShell (ensure backend is running):

```powershell
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/expenses
```

The expenses request requires valid Supabase configuration and the SQL schema to have been applied. For POST/PUT testing, send JSON with `Content-Type: application/json` and the required fields.

## Validation and errors

- Expense title: 1–100 characters.
- Amount: greater than ₹0 and at most ₹10,000,000.
- Category must be one of the seven listed categories.
- Date must be a real date and not in the future.
- Note: optional, up to 250 characters.
- Invalid request data returns HTTP 400; invalid UUID returns HTTP 400; missing record returns HTTP 404; unavailable database configuration returns HTTP 503; database errors return HTTP 500 with a safe message. Details are printed in the backend terminal.

## Git and GitHub

From the project root:

```bash
git init
git add .
git commit -m "Build student expense tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own repository URL. If the repository already has an `origin`, use `git remote set-url origin YOUR-REPOSITORY-URL` instead of adding it again. Verify that `.env` is not staged before pushing.

## Troubleshooting

- **“Database is not configured”**: make sure `backend/.env` exists, contains `SUPABASE_URL` and `SUPABASE_ANON_KEY`, and restart the backend.
- **401/403 or database error**: verify the URL/key pair belongs to the same Supabase project and run `database/schema.sql` completely.
- **relation does not exist**: run the schema SQL in the correct Supabase project.
- **Failed to fetch / CORS**: ensure backend is running on port 3000 and the frontend's exact origin is included in `FRONTEND_ORIGIN`.
- **Port already in use**: change `PORT` in `.env` and update `API_BASE` in `frontend/script.js`, or stop the process already using port 3000.
- **Changes not showing**: refresh the frontend with Ctrl+F5 and restart the backend after changing `.env`.
- **Supabase quota/network issue**: check the Supabase project status and backend terminal logs.

## Security note and limitations

This version intentionally has no login or per-student accounts. To keep the demo usable without authentication, the supplied RLS policies grant the Supabase `anon` role read/write access to the demo tables. **Anyone who can reach the API can view, add, change, or delete the shared demo data. Do not deploy this configuration for real users or sensitive financial data.** RLS is enabled, but these permissive policies are not private-user security.

For production, add Supabase Auth, associate each row with an authenticated user ID, use restrictive RLS policies based on `auth.uid()`, and enforce authentication/authorization in the API. Never expose a service-role key in browser code. Add rate limiting, stronger operational monitoring, and deployment-specific CORS configuration before public hosting.

Other limitations: one shared monthly budget; the dashboard's budget summary uses the current calendar month; no recurring transactions or export feature; no automated live Supabase test can be run until you supply credentials and configure the schema.

## 3-day development plan

- **Day 1:** Build responsive HTML/CSS layout and expense form.
- **Day 2:** Implement Express REST endpoints, Supabase schema, and CRUD integration.
- **Day 3:** Connect the frontend, validate inputs, test common errors, and prepare GitHub submission.

## Short demonstration script

1. Open the dashboard and point out the spending, budget, and category overview.
2. Set a monthly budget.
3. Add a food expense with an amount, date, and optional note.
4. Show the new transaction and updated dashboard.
5. Search for the expense and filter by category.
6. Edit the expense amount, then delete the record.
7. Explain that changes are stored in Supabase PostgreSQL through the Express API.

## Viva questions and answers

**1. What is the purpose of this project?**  
It helps students record daily expenses and compare spending with a monthly budget.

**2. What does Express.js do?**  
Express.js creates the backend HTTP server and API routes that receive requests from the frontend.

**3. Why use Supabase?**  
Supabase provides a hosted PostgreSQL database and tools to manage the data.

**4. What is CRUD?**  
CRUD means Create, Read, Update, and Delete—the four basic operations used to manage records.

**5. Why should secret keys not be placed in frontend JavaScript?**  
Frontend code is visible to visitors. Private keys could be copied and misused, so credentials belong on the backend.
