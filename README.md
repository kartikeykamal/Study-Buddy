📚 Study Buddy
An AI-powered study companion built with React and Vite, designed to make exam prep smarter, faster, and more engaging.

✨ Features
ModuleDescription🧠 AI TutorAsk questions and get instant AI-powered explanations📅 Study PlanGenerate personalized daily study schedules📋 Syllabus AnalyzerUpload your syllabus and get a smart breakdown🗺️ Mind MapVisualize topics and their connections📝 NotesWrite and organize your study notes🃏 FlashcardsCreate and review flashcards for quick revision🧪 Mock TestTake timed practice tests📊 PYQ AnalyzerAnalyze previous year questions for patterns⚡ Quiz BlitzFast-paced quiz rounds to test your knowledge⏱️ Focus TimerPomodoro-style timer to stay on track🔥 Streak & XPGamified streaks and experience points to stay motivated📈 ProgressTrack your study progress over time

🛠️ Tech Stack

Frontend — React + Vite
UI Icons — Lucide React
AI — Google Gemini API
Styling — Custom CSS with global design tokens


🚀 Getting Started
Prerequisites

Node.js (v18 or above)
A Google Gemini API Key

Installation
bash# Clone the repository
git clone https://github.com/your-username/study-buddy.git
cd study-buddy

# Install dependencies
npm install
Environment Setup
Create a .env file in the root directory:
envVITE_GEMINI_KEY=your_gemini_api_key_here
Run Locally
bashnpm run dev
Build for Production
bashnpm run build
npm run preview

📁 Project Structure
src/
├── components/       # Shared UI components (Sidebar, TopBar, Dock, etc.)
├── modules/          # Feature modules (AITutor, Flashcards, MockTest, etc.)
├── landing/          # Landing page components and styles
├── utils/            # Utility functions and helpers
└── styles/           # Global CSS styles
