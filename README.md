# 🎓 SchoolOps AI

**SchoolOps AI** is an AI-powered school administration platform that automates academic and administrative workflows using Google Gemini Function Calling, a Node.js backend, and a React frontend.

Designed as an intelligent AI agent, SchoolOps AI understands natural language requests and executes backend functions to help schools manage students, teachers, attendance, reports, and timetables with minimal manual effort.

---

## ✨ Features

- 🤖 AI-powered school administration assistant
- 👨‍🎓 Student management system
- 👩‍🏫 Teacher management
- 📅 Attendance tracking and analytics
- 🗓️ Automated conflict-free timetable generation
- 📊 Academic performance reporting
- 📚 Curriculum management
- 📁 Spreadsheet synchronization with automatic file watching
- 📄 Export reports as PDF and DOCX
- 💬 Natural language interaction through Google Gemini Function Calling

---

## 🧠 AI Agent Architecture

SchoolOps AI uses a **tool-based AI agent architecture** powered by **Google Gemini Function Calling**.

Instead of hardcoded workflows, users can interact with the system using natural language. The AI determines the appropriate backend function to execute and returns structured results.

### Supported AI Actions

- Retrieve student records
- Retrieve teacher information
- Analyze attendance
- Generate academic reports
- Create timetables
- Manage curriculum data
- Synchronize spreadsheet data

---

## 🛠️ Tech Stack

### Backend

- Node.js
- Express.js
- SQLite (better-sqlite3)
- Google Gemini API
- Chokidar
- PDFKit
- DOCX

### Frontend

- React
- Vite

---

## 📂 Project Structure

```text
SchoolOps-AI/
├── backend/
│   ├── ai/
│   ├── db/
│   ├── routes/
│   ├── services/
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── vite.config.js
│
├── data/
├── exports/
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- Google Gemini API Key

### Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/SchoolOps-AI.git
```

Navigate into the project directory:

```bash
cd SchoolOps-AI
```

Install dependencies:

```bash
npm install
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root and add:

```env
GEMINI_API_KEY=your_gemini_api_key
```

---

## ▶️ Running the Application

Start the development server:

```bash
npm run dev
```

The application will launch the backend and frontend (depending on your project configuration).

---

## 📌 Core Capabilities

- AI-driven school administration
- Intelligent function calling
- Real-time spreadsheet synchronization
- Automated timetable scheduling
- Attendance insights
- Academic reporting
- PDF and DOCX exports
- Modular backend architecture

---

## 🎯 Project Purpose

SchoolOps AI was developed as an **AI Agents Capstone Project** to demonstrate:

- AI Function Calling
- Multi-tool orchestration
- Intelligent backend automation
- Real-time data workflows
- Full-stack AI application development

---

## 📜 License

This project is intended for educational and demonstration purposes.
