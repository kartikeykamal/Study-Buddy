# 📚 Study Buddy

**An AI-powered study companion that turns exam prep into a focused, gamified routine.**

Study Buddy bundles tutoring, planning, note-taking, and revision tools into a single React + Vite app, powered by the Google Gemini API. Upload a syllabus, get a study plan, quiz yourself, and track your progress — all in one place.

---

## ✨ Features

| Module | Description |
|---|---|
| 🧠 AI Tutor | Ask questions and get instant AI-powered explanations |
| 📅 Study Plan | Generate a personalized daily study schedule |
| 📋 Syllabus Analyzer | Upload your syllabus and get a smart breakdown |
| 🗺️ Mind Map | Visualize topics and how they connect |
| 📝 Notes | Write and organize your study notes |
| 🃏 Flashcards | Create and review flashcards for quick revision |
| 🧪 Mock Test | Take timed practice tests |
| 📊 PYQ Analyzer | Analyze previous-year questions for recurring patterns |
| ⚡ Quiz Blitz | Fast-paced quiz rounds to test your knowledge |
| ⏱️ Focus Timer | Pomodoro-style timer to stay on track |
| 🔥 Streak & XP | Gamified streaks and experience points to stay motivated |
| 📈 Progress | Track your study progress over time |

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite 5
- **UI Icons:** Lucide React
- **AI:** Google Gemini API (`gemini-2.0-flash` by default, configurable)
- **Styling:** Custom CSS with global design tokens

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or above
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/kartikeykamal/Study-Buddy.git
cd Study-Buddy

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_GEMINI_KEY=your_gemini_api_key_here

# Optional: override the default model, or list fallbacks (comma-separated)
VITE_GEMINI_MODELS=gemini-2.0-flash,gemini-2.5-flash
```

### Run Locally

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run build` | Builds an optimized production bundle to `dist/` |
| `npm run preview` | Serves the production build locally for testing |

## 📁 Project Structure

```
src/
├── components/   # Shared UI (Sidebar, TopBar, Dock, CommandPalette, etc.)
├── modules/      # Feature modules (AI Tutor, Flashcards, Mock Test, etc.)
├── landing/      # Landing page components and styles
├── utils/        # Helpers, including the Gemini API client and rate limiter
└── styles/       # Global CSS and design tokens
```

## 🤝 Contributing

Contributions are welcome. To propose a change:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

## 👤 Author

Built by [Kartikey Kamal](https://github.com/kartikeykamal).
