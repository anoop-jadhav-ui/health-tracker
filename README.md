# Health Tracker App

A modern, privacy-focused food and symptom tracker built with React and Firebase. Log meals, symptoms, and discover possible food triggers using a simple, unified interface.

## Features
- **Log Meals:** Add food entries with meal type, portion size, notes, and timestamp.
- **Log Symptoms:** Track symptoms with severity, notes (encrypted), and timestamp.
- **Trends & Analysis:** View possible food triggers based on your logs using built-in correlation rules.
- **Google or Anonymous Sign-In:** Sign in with Google or use the app anonymously.
- **Modern UI:** Clean, consistent design using inline styles (no Tailwind or external CSS frameworks).
- **Privacy:** Symptom notes are encrypted before storage.

## Screenshots
> _Add your own screenshots here!_

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [Firebase Project](https://firebase.google.com/)

### Setup
1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd health-tracker
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure Environment Variables:**
   Create a `.env` file in the project root with the following variables:
   ```env
   VITE_APP_ID=your-app-id
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-firebase-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-firebase-measurement-id
   # Optional: For custom authentication
   VITE_INITIAL_AUTH_TOKEN=your-custom-auth-token
   ```
   > _Get these values from your Firebase project settings._

4. **Enable Firebase Authentication:**
   - Go to the Firebase Console → Authentication → Sign-in method.
   - Enable **Anonymous** and/or **Google** sign-in.

5. **Run the app:**
   ```sh
   npm run dev
   ```
   The app will be available at [http://localhost:5173](http://localhost:5173) (default Vite port).

## Project Structure
- `index.jsx` — Main React app, all screens and logic.
- `package.json` — Project dependencies (no Tailwind, uses inline styles).
- `.env` — Your environment variables (not committed).

## Customization
- **Food Categories:**
  - By default, food entries are categorized as "Uncategorized". You can extend the logic to auto-categorize foods or add a category selector.
- **Symptom Types:**
  - The list of symptoms can be customized in the code.
- **Correlation Rules:**
  - The rules for identifying triggers are defined in `index.jsx` (see `KNOWN_TRIGGERS`).

## Security & Privacy
- Symptom notes are encrypted in the browser before being sent to Firebase.
- All sensitive config is loaded from environment variables.

## Deployment
- You can deploy this app to Vercel, Netlify, or Firebase Hosting. Make sure to set the same environment variables in your deployment platform.

## License
MIT

---

_This project was modernized to remove Tailwind CSS, use environment variables, and provide a clean, unified UI. For questions or contributions, open an issue or pull request!_
