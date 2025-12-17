# DocuLens - AI-Powered SDLC Documentation Assistant

DocuLens is a full-stack application that automatically generates professional documentation for your software projects across the entire SDLC lifecycle. Upload code, connect GitHub repositories, and let AI generate comprehensive documentation tailored to each development stage.

## ✨ Features

### Core Features
- **SDLC Stage-Based Documentation**: Organize docs by lifecycle stages (Requirements, Design, Development, Testing, Deployment, Maintenance)
- **Multi-Repository Projects**: Link multiple repositories (frontend, backend, API) to a single project
- **Smart Code Analysis**: Automatically detects languages, frameworks, APIs, and project structure
- **AI-Powered Generation**: Generate professional documentation using your preferred AI provider
- **Human-in-the-Loop**: Review and customize AI-suggested sections before generation

### Template & Section Libraries
- **Template Library**: Browse all document templates organized by SDLC stage, view sections, and edit section descriptions centrally
- **Section Library**: View all available sections and see which templates use them (read-only reference)
- **Central Description Management**: Edit section descriptions once in Template Library - changes propagate to all documents using that section

### Document Editor
- **Real-time Progress**: Visual progress bar showing generation status for each section
- **Prompt Editing**: Customize prompts per section for fine-tuned content generation
- **Rich Text Editor**: Edit generated content with full markdown support
- **Section Reordering**: Drag-and-drop to reorganize sections
- **Multi-Format Export**: Export to Markdown, DOCX, or PDF

### AI Providers (Priority Order)
1. **Ollama / LM Studio** - Local models (highest priority)
2. **Databricks Foundation Models** - Enterprise AI
3. **Google Gemini** - Fast, free tier available
4. **Anthropic Claude** - High quality output
5. **Placeholder Content** - Smart fallback when no AI available

## 🛠 Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM with SQLite/PostgreSQL support
- **Multi-Provider AI** - Ollama, Databricks, Gemini, Anthropic

### Frontend
- **React 18** + TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Styling with custom coral/rose theme
- **React Query** - Server state management
- **Framer Motion** - Animations
- **TipTap** - Rich text editor

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1. Clone the repository
```bash
git clone https://github.com/rajatsaxena2504/DocuLens.git
cd DocuLens
```

### 2. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` with your preferred AI provider (see [AI Configuration](#ai-configuration) below).

### 3. Start the Backend
```bash
cd backend
pip install -r requirements.txt
python -m app.data.seed  # Seed templates and sections
uvicorn app.main:app --reload --port 8000
```

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## 📖 Usage

1. **Create Project**: Name your SDLC project
2. **Add Repositories**: Upload code or connect GitHub repos (frontend, backend, etc.)
3. **Select Stage**: Choose the SDLC stage (Requirements, Design, Development, etc.)
4. **Pick Template**: Select a documentation template for that stage
5. **Review Sections**: AI suggests relevant sections based on code analysis
6. **Generate**: Click "Generate All" to create content for all sections
7. **Refine**: Edit prompts and regenerate individual sections as needed
8. **Export**: Download as Markdown, DOCX, or PDF

## ⚙️ AI Configuration

Configure your preferred AI provider in `.env`. DocuLens uses the first available provider:

### Option 1: Ollama / LM Studio (Local - Recommended for Privacy)
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```
For LM Studio (OpenAI-compatible):
```env
OLLAMA_BASE_URL=http://localhost:1234/v1
OLLAMA_MODEL=your-loaded-model
```

### Option 2: Databricks Foundation Models
```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-personal-access-token
DATABRICKS_MODEL=databricks-meta-llama-3-1-70b-instruct
```

### Option 3: Google Gemini
```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

### Option 4: Anthropic Claude
```env
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

## 📁 Project Structure

```
DocuLens/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # AI service, code analyzer, generator
│   │   ├── data/          # Seed data (templates, sections)
│   │   └── config.py      # Configuration
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   ├── context/       # React context (auth, project)
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
│   └── package.json
├── .env.example
└── README.md
```

## 🔧 Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama/LM Studio endpoint | - |
| `OLLAMA_MODEL` | Local model name | `llama3.2` |
| `DATABRICKS_HOST` | Databricks workspace URL | - |
| `DATABRICKS_TOKEN` | Databricks access token | - |
| `DATABRICKS_MODEL` | Model serving endpoint | `databricks-meta-llama-3-1-70b-instruct` |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.0-flash` |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `ANTHROPIC_MODEL` | Claude model name | `claude-3-haiku-20240307` |
| `DATABASE_URL` | Database connection | SQLite (dev) |
| `SECRET_KEY` | JWT secret | Change in production |
| `GITHUB_TOKEN` | For private repos | Optional |

## 📡 API Endpoints

### Projects
- `GET /api/sdlc-projects` - List SDLC projects
- `POST /api/sdlc-projects` - Create project
- `POST /api/sdlc-projects/{id}/repositories` - Add repository

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/{id}` - Get document with sections

### Generation
- `POST /api/generation/documents/{id}/generate` - Generate all sections
- `POST /api/generation/documents/{id}/sections/{section_id}/generate` - Regenerate section with custom prompt
- `GET /api/generation/documents/{id}/export?format=markdown|docx|pdf` - Export

### Libraries
- `GET /api/templates/library/with-sections` - List all templates with their sections
- `GET /api/sections/library/with-templates` - List all sections with template usage
- `PATCH /api/sections/{id}/description` - Update section description centrally

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/) and [React](https://react.dev/)
- AI powered by [Ollama](https://ollama.ai/), [Databricks](https://databricks.com/), [Google Gemini](https://ai.google.dev/), and [Anthropic Claude](https://anthropic.com/)
