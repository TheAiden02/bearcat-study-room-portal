# Running the Bearcat Study Room Portal locally

Works the same on macOS and Windows. Docker runs everything (web app, API and a Postgres database), so you don't need Node, Python or Postgres installed.

| Service | URL |
|---|---|
| Web app | http://localhost:5173 |
| API docs (Swagger) | http://localhost:8000/docs |
| Postgres | `localhost:5432` (user, password and database are all `bsrp`) |

## 1. Install prerequisites

### Git
- **Mac:** `xcode-select --install` (or `brew install git`)
- **Windows:** https://git-scm.com/download/win

### Docker

**Windows**
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Leave "Use WSL 2" ticked when asked.
2. Restart if prompted, then launch Docker Desktop and wait until it says it is running.
3. Check in PowerShell: `docker --version` and `docker compose version`.

If Docker Desktop complains about virtualization, enable virtualization (Intel VT-x / AMD-V) in your BIOS, and run `wsl --install` in an admin PowerShell.

**Mac** (pick one)
- **Docker Desktop:** https://www.docker.com/products/docker-desktop/. Install, launch, wait for it to start. Note that Docker Desktop has licensing terms for larger organizations.
- **Colima (free, command line):**
  ```bash
  brew install docker docker-compose colima
  colima start
  ```
  The Compose plugin may need registering. Add this to `~/.docker/config.json`:
  ```json
  { "cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"] }
  ```
  Colima doesn't start on reboot. Run `colima start` before using Docker.

## 2. Get the code

```bash
git clone https://github.com/TheAiden02/bearcat-study-room-portal.git
cd bearcat-study-room-portal
```

## 3. Start everything

From the repo root:

```bash
docker compose up --build
```

The first run takes a few minutes while images download. When you see `Application startup complete` from the `api` service, open http://localhost:5173.

Add `-d` to run in the background, and stop with `docker compose down`.

## 4. Log in

The login is hard-coded in the frontend for now (`react/bsrp-react-app/src/data/DummyData.js`):

- Admin: `Bearcat` / `Admin`
- Students: `ElijahAdmin`, `FernAdmin`, `CaitlinAdmin`, `MacyAdmin` or `ShrutikaAdmin` with password `123`

## Everyday commands

| Task | Command |
|---|---|
| Start (rebuild if code changed) | `docker compose up --build` |
| Start in background | `docker compose up -d` |
| Stop | `docker compose down` |
| Rebuild only the web app | `docker compose up -d --build web` |
| Rebuild only the API | `docker compose up -d --build api` |
| View API logs | `docker compose logs -f api` |
| Open a database shell | `docker compose exec db psql -U bsrp` |
| Wipe the database and reload the schema | `docker compose down -v` then `docker compose up --build` |

The SQL files in `database/` only run when the database volume is created, so after editing a schema file use the wipe command above.

## Faster front-end development (optional)

The Docker web image is a production build with no hot reload. To iterate on the UI quickly, run only the API and database in Docker and run the front end with Vite:

```bash
docker compose up -d db api
cd react/bsrp-react-app
npm ci
npm run dev
```

Vite prints the URL (usually http://localhost:5173, so stop the Docker `web` service first if it is running). This needs Node 22+.

## Running the API without Docker (optional)

Needs Python 3.12 and a running Postgres (for example `docker compose up -d db`).

macOS / Linux:
```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://bsrp:bsrp@localhost:5432/bsrp
uvicorn server:app --reload
```

Windows (PowerShell):
```powershell
cd api
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql://bsrp:bsrp@localhost:5432/bsrp"
uvicorn server:app --reload
```

## Troubleshooting

- **`Cannot connect to the Docker daemon` / `failed to connect to the docker API`:** Docker isn't running. Start Docker Desktop, or run `colima start` on Mac.
- **`port is already allocated` (5173, 8000 or 5432):** another program is using that port. Stop it, or change the left-hand number in the `ports:` entry in `docker-compose.yml`. Locally installed Postgres is the usual cause for 5432.
- **API exits with `KeyError: 'DATABASE_URL'`:** you ran the API outside compose without setting the variable. See the section above.
- **API exits with a database connection error:** the database wasn't ready or isn't running. Run `docker compose ps` and check that `db` is healthy.
- **Changes to the front end don't show up:** the web image is built, not live. Run `docker compose up -d --build web`, or use the Vite workflow above.
- **Mac, Docker Desktop and Colima both installed:** only one config can be active. Use `docker context ls` and `docker context use <name>` to switch.
- **Windows, slow builds:** clone the repo inside the WSL filesystem (for example `~/code`) instead of under `C:\`, and run commands from a WSL terminal.
