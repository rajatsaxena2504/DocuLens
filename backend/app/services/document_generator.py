import os
from typing import Any
from sqlalchemy.orm import Session
from app.models import Document, DocumentSection, GeneratedContent, Project
from app.services.claude_service import ClaudeService
from app.services.code_analyzer import CodeAnalyzer


class DocumentGenerator:
    """Service for generating document content using AI."""

    def __init__(self, db: Session):
        self.db = db
        self.claude_service = ClaudeService()
        self.code_analyzer = CodeAnalyzer()

    def generate_document(self, document_id: str) -> list[dict]:
        """Generate content for all sections in a document."""
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found")

        # Update status
        document.status = "generating"
        self.db.commit()

        results = []

        try:
            # Get project and analysis data
            project = document.project
            code_path = self._get_code_path(project)
            analysis_data = project.analysis_data or {}

            # Get document type name
            doc_type_name = document.document_type.name if document.document_type else "Technical Documentation"

            # Generate content for each included section
            for section in document.sections:
                if not section.is_included:
                    continue

                try:
                    content, used_placeholder = self._generate_section_content(
                        section=section,
                        code_path=code_path,
                        analysis_data=analysis_data,
                        doc_type_name=doc_type_name,
                    )

                    # Save generated content
                    generated = self._save_content(section.id, content)
                    results.append({
                        'section_id': str(section.id),
                        'title': section.title,
                        'success': True,
                        'content_id': str(generated.id),
                        'used_placeholder': used_placeholder,
                    })

                except Exception as e:
                    results.append({
                        'section_id': str(section.id),
                        'title': section.title,
                        'success': False,
                        'error': str(e),
                    })

            # Update document status
            document.status = "completed"
            self.db.commit()

        except Exception as e:
            document.status = "draft"
            self.db.commit()
            raise e

        return results

    def regenerate_section(self, document_id: str, section_id: str) -> dict:
        """Regenerate content for a specific section."""
        section = (
            self.db.query(DocumentSection)
            .filter(
                DocumentSection.id == section_id,
                DocumentSection.document_id == document_id,
            )
            .first()
        )

        if not section:
            raise ValueError("Section not found")

        document = section.document
        project = document.project
        code_path = self._get_code_path(project)
        analysis_data = project.analysis_data or {}
        doc_type_name = document.document_type.name if document.document_type else "Technical Documentation"

        content, used_placeholder = self._generate_section_content(
            section=section,
            code_path=code_path,
            analysis_data=analysis_data,
            doc_type_name=doc_type_name,
        )

        generated = self._save_content(section_id, content)

        return {
            'section_id': str(section.id),
            'title': section.title,
            'content_id': str(generated.id),
            'content': content,
            'used_placeholder': used_placeholder,
        }

    def _get_code_path(self, project: Project) -> str:
        """Get the path to the code files."""
        if project.source_type == "upload":
            return os.path.join(project.storage_path, "code")
        return project.storage_path

    def _generate_section_content(
        self,
        section: DocumentSection,
        code_path: str,
        analysis_data: dict[str, Any],
        doc_type_name: str,
    ) -> tuple[str, bool]:
        """Generate content for a single section.

        Returns:
            tuple: (content, used_placeholder) - content string and whether placeholder was used
        """
        # Get relevant files for this section
        relevant_files = self.code_analyzer.get_relevant_files_for_section(
            code_path,
            section.title,
            analysis_data,
            max_files=5,
        )

        # Build code context
        code_context = ""
        for file_info in relevant_files:
            code_context += f"\n\n--- {file_info['path']} ---\n{file_info['content']}"

        if not code_context:
            code_context = "No specific code files found for this section. Generate based on general project structure."

        try:
            # Generate content using Claude
            content = self.claude_service.generate_section_content(
                section_title=section.title,
                section_description=section.description,
                code_context=code_context,
                document_type=doc_type_name,
            )
            return content, False
        except Exception as e:
            # Fallback: generate placeholder content when AI fails
            print(f"AI generation failed for section '{section.title}': {e}")
            return self._generate_placeholder_content(section, analysis_data, relevant_files), True

    def _generate_placeholder_content(
        self,
        section: DocumentSection,
        analysis_data: dict[str, Any],
        relevant_files: list[dict],
    ) -> str:
        """Generate placeholder content when AI is unavailable."""
        content = f"## {section.title}\n\n"

        if section.description:
            content += f"{section.description}\n\n"

        content += "---\n\n"
        content += "*This section requires manual content. AI generation was unavailable.*\n\n"

        # Add helpful context based on section type
        title_lower = section.title.lower()

        if 'overview' in title_lower or 'introduction' in title_lower:
            content += "### Suggested Content:\n"
            content += "- Project purpose and goals\n"
            content += "- Key features and capabilities\n"
            content += "- Target audience\n"
            if analysis_data.get('primary_language'):
                content += f"\n**Primary Language:** {analysis_data.get('primary_language')}\n"

        elif 'architecture' in title_lower or 'design' in title_lower:
            content += "### Suggested Content:\n"
            content += "- System components and their relationships\n"
            content += "- Data flow diagrams\n"
            content += "- Technology stack decisions\n"
            if analysis_data.get('frameworks'):
                content += f"\n**Detected Frameworks:** {', '.join(analysis_data.get('frameworks', []))}\n"

        elif 'api' in title_lower:
            content += "### Suggested Content:\n"
            content += "- API endpoints and methods\n"
            content += "- Request/response formats\n"
            content += "- Authentication requirements\n"
            content += "- Example requests\n"

        elif 'install' in title_lower or 'setup' in title_lower or 'getting started' in title_lower:
            content += "### Suggested Content:\n"
            content += "- Prerequisites and requirements\n"
            content += "- Installation steps\n"
            content += "- Configuration options\n"
            content += "- Verification steps\n"

        elif 'usage' in title_lower or 'guide' in title_lower:
            content += "### Suggested Content:\n"
            content += "- Common use cases\n"
            content += "- Code examples\n"
            content += "- Best practices\n"

        else:
            content += "### Suggested Content:\n"
            content += f"- Details about {section.title}\n"
            content += "- Relevant code explanations\n"
            content += "- Examples and usage\n"

        # Add relevant files info
        if relevant_files:
            content += "\n### Relevant Files:\n"
            for f in relevant_files[:5]:
                content += f"- `{f['path']}`\n"

        return content

    def _save_content(self, section_id: str, content: str) -> GeneratedContent:
        """Save generated content with version tracking."""
        # Get current max version
        current_max = (
            self.db.query(GeneratedContent)
            .filter(GeneratedContent.document_section_id == section_id)
            .order_by(GeneratedContent.version.desc())
            .first()
        )

        new_version = (current_max.version + 1) if current_max else 1

        generated = GeneratedContent(
            document_section_id=section_id,
            content=content,
            version=new_version,
            is_ai_generated=True,
        )

        self.db.add(generated)
        self.db.commit()
        self.db.refresh(generated)

        return generated
