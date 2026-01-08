from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, projects, documents, sections, templates, generation, sdlc_projects, organizations, connectors, sttm, files, admin
from app.database import engine, Base
# Import all models to ensure they're registered with Base
from app.models import user, project, document, section, document_type, generated_content, sdlc_project, sdlc_stage, organization, document_version, project_member, document_review, connector, sttm_mapping


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all database tables on startup (for SQLite development)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="DocuLens",
    description="SDLC Documentation Assistant - AI-powered documentation generator with human-in-the-loop capabilities",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5175", "http://localhost:5176", "http://127.0.0.1:5176"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["Organizations"])
app.include_router(sdlc_projects.router, prefix="/api/sdlc-projects", tags=["SDLC Projects"])
app.include_router(projects.router, prefix="/api/projects", tags=["Repositories"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(sections.router, prefix="/api/sections", tags=["Sections"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(generation.router, prefix="/api/generation", tags=["Generation"])
app.include_router(connectors.router, prefix="/api/connectors", tags=["Connectors"])
app.include_router(sttm.router, prefix="/api", tags=["STTM"])
app.include_router(files.router, prefix="/api", tags=["Files"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/")
async def root():
    return {"message": "Welcome to DocuLens API", "version": "0.2.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
