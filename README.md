# DocuLens - AI-Powered SDLC Documentation Assistant

DocuLens is a full-stack application that automatically generates professional documentation for your software projects across the entire SDLC lifecycle. Upload code, connect GitHub repositories, and let AI generate comprehensive documentation tailored to each development stage.

## ✨ Features

### Core Features
- **SDLC Stage-Based Documentation**: Organize docs by lifecycle stages (Requirements, Design, Development, Testing, Deployment, Maintenance)
- **Multi-Repository Projects**: Link multiple repositories (frontend, backend, API) to a single project
- **Smart Code Analysis**: Automatically detects languages, frameworks, APIs, and project structure
- **AI-Powered Generation**: Generate professional documentation using your preferred AI provider
- **Human-in-the-Loop**: Review and customize AI-suggested sections before generation

### Multi-Tenant & Collaboration
- **Organizations**: Create teams with role-based access (admin, editor, viewer)
- **Project Teams**: Invite members to projects with owner/editor/viewer roles
- **Document Versioning**: Save snapshots, compare versions side-by-side, restore any version
- **Review Workflow**: Submit documents for review, request changes, approve with comments
- **Section-Level Comments**: Reviewers can comment on specific sections

### Template & Section Libraries
- **Template Library**: Browse all document templates organized by SDLC stage, view sections, and edit section descriptions centrally
- **Section Library**: View all available sections and see which templates use them (read-only reference)
- **Central Description Management**: Edit section descriptions once in Template Library - changes propagate to all documents using that section
- **Organization Templates**: Admins can create and manage organization-specific templates

### Document Editor
- **Real-time Progress**: Visual progress bar showing generation status for each section
- **Prompt Editing**: Customize prompts per section for fine-tuned content generation
- **Rich Text Editor**: Edit generated content with full markdown support
- **Section Reordering**: Drag-and-drop to reorganize sections
- **Multi-Format Export**: Export to Markdown, DOCX, or PDF

### External Integrations
- **Jira Connector**: Import issues and user stories into documentation
- **Confluence Connector**: Pull existing documentation from Confluence spaces
- **Miro Connector**: Import diagrams and boards
- **SharePoint Connector**: Access enterprise documents

### Data Documentation (STTM)
- **Source-to-Target Mapping**: Document ETL/data transformations with spreadsheet-like interface
- **Transformation Types**: Direct, derived, constant, lookup, aggregate, conditional mappings
- **CSV Import/Export**: Bulk import from existing mapping spreadsheets
- **Auto-Generate Narratives**: Convert mappings to readable documentation

### File-Level Documentation
- **File Browser**: Navigate project files with tree structure
- **Per-File Analysis**: Auto-extract functions, classes, imports, dependencies
- **Supported File Types**: Python (AST), SQL, Jupyter notebooks, JavaScript/TypeScript
- **File-Specific Templates**: Suggested sections based on file type

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

### Clone the repository
```bash
git clone https://github.com/rajatsaxena2504/DocuLens.git
cd DocuLens
```

---

## Option A: Local Setup (Recommended)

### Linux/macOS

**One-time setup:**
```bash
./setup-local.sh
```

**Add your AI API key:**
Edit `backend/.env` and set your Gemini key (or other provider):
```
GEMINI_API_KEY=your-gemini-key-here
```

**Run the application:**
```bash
./run-local.sh
```

### Windows (VS Code Terminal / PowerShell)

**One-time setup:**
```powershell
# Setup Backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Create backend/.env file with:
# DATABASE_URL=sqlite:///./doculens.db
# SECRET_KEY=local-dev-secret-key
# GEMINI_API_KEY=your-gemini-key-here
# GEMINI_MODEL=gemini-2.0-flash

# Seed the database
python -m app.data.seed

# Setup Frontend (new terminal)
cd frontend
npm install
echo VITE_API_URL=http://localhost:8000 > .env
```

**Run the application (two terminals):**

Terminal 1 - Backend:
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

---

## Option B: Docker Setup

**One-time setup:**
```bash
cp .env.example .env
# Edit .env with your AI API keys
```

**Run with Docker Compose:**
```bash
docker compose up --build
```

**After containers start, seed the database:**
```bash
docker exec docugen-backend alembic stamp head
docker exec docugen-backend python -m app.data.seed
```

---

## Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

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

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user

### Organizations
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `POST /api/organizations/{id}/members` - Add member by email

### Projects
- `GET /api/sdlc-projects` - List SDLC projects
- `POST /api/sdlc-projects` - Create project
- `POST /api/sdlc-projects/{id}/repositories` - Add repository
- `POST /api/sdlc-projects/{id}/members` - Add project member

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/{id}` - Get document with sections
- `GET /api/documents/{id}/versions` - List version history
- `POST /api/documents/{id}/versions` - Create version snapshot
- `POST /api/documents/{id}/submit-review` - Submit for review
- `POST /api/documents/{id}/review` - Submit review decision

### Generation
- `POST /api/generation/documents/{id}/generate` - Generate all sections
- `POST /api/generation/documents/{id}/sections/{section_id}/generate` - Regenerate section
- `GET /api/generation/documents/{id}/export?format=markdown|docx|pdf` - Export

### Connectors
- `GET /api/connectors/organization/{id}` - List connectors
- `POST /api/connectors/{id}/test` - Test connection
- `GET /api/connectors/{id}/jira/projects` - List Jira projects
- `POST /api/connectors/{id}/import/{doc_id}` - Import content

### STTM (Source-to-Target Mapping)
- `GET /api/documents/{id}/sttm` - List mappings
- `POST /api/documents/{id}/sttm/bulk` - Bulk create mappings
- `GET /api/documents/{id}/sttm/export` - Export to CSV
- `POST /api/documents/{id}/sttm/generate-doc` - Generate narrative

### Files
- `GET /api/projects/{id}/files/tree` - File tree structure
- `POST /api/projects/{id}/files/analyze` - Analyze file
- `POST /api/documents/file-level` - Create file-level document

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
