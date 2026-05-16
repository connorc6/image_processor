# GroceryTracker

Snap a receipt photo → Claude extracts every item → tap which ones went into dinner → each roommate's running "dinner pot" total updates automatically.

## Project structure

```
├── backend/          FastAPI + SQLite server (receipt parsing + data storage)
└── mobile/           Expo (React Native) app
```

---

## 1 · Get an Anthropic API key

Go to [console.anthropic.com](https://console.anthropic.com), create an account, and generate a key.

---

## 2 · Run the backend

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt

export ANTHROPIC_API_KEY=sk-ant-...

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API runs at `http://localhost:8000` — interactive docs at `/docs`.

> Use `--host 0.0.0.0` so your phone can reach the server on the local network.

---

## 3 · Configure the mobile app

Open `mobile/lib/api.ts` and set `API_BASE`:

```ts
// iOS Simulator
export const API_BASE = "http://localhost:8000";

// Physical device — find your Mac's IP: ifconfig | grep 'inet '
export const API_BASE = "http://192.168.x.x:8000";
```

---

## 4 · Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

- **iOS Simulator** → press `i`
- **Android Emulator** → press `a`
- **Physical device** → install [Expo Go](https://expo.dev/client) and scan the QR code

---

## How it works

| Tab | What it does |
|-----|-------------|
| **Summary** | Add roommates; see running dinner-pot totals with a progress bar |
| **Scan** | Take a photo or pick from library; Claude reads the receipt (~3 sec) |
| **Review** | Deselect items that shouldn't count; pick whose pot; tap **Save to Pot** |
| **History** | All past sessions; tap for item breakdown; long-press to delete |

---

## Resetting data

Delete `backend/grocery.db` — it recreates itself on next startup.
