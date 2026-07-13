🧪 Test it now (the backend stack is already running)

1. Frontend — new terminal:
   cd "C:/Users/bhnbi/Music/SaaS/newell/web"
   npm install
   npm run dev # open the printed URL, usually http://localhost:5173

2. In the browser: enter a phone (e.g. +8801700000000) → Send code.

3. Get the OTP (mock SMS prints it):
   docker compose -f infra/docker-compose.yml logs -f auth

# newest line: "message": "Your Newell verification code is XXXXXX"

Enter the 6 digits → you land on the profile → edit the name, toggle en/bn, logout. Watch the seedling stem grow a leaf per step.

Full walkthrough + troubleshooting: docs/RUNBOOK-p1.md.

When you're done testing, tear the backend down with:
docker compose -f infra/docker-compose.yml down
