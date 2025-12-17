import os
from typing import Any, Optional
from sqlalchemy.orm import Session
from app.models import Document, DocumentSection, GeneratedContent, Project, SDLCProject
from app.services.claude_service import ClaudeService
from app.services.code_analyzer import CodeAnalyzer


class DocumentGenerator:
    """Service for generating document content using AI."""

    def __init__(self, db: Session):
        self.db = db
        self.claude_service = ClaudeService()
        self.code_analyzer = CodeAnalyzer()

    def generate_document(
        self,
        document_id: str,
        repository_ids: Optional[list[str]] = None,
    ) -> list[dict]:
        """Generate content for all sections in a document."""
        document = self.db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found")

        # Update status
        document.status = "generating"
        self.db.commit()

        results = []

        try:
            # Get repositories and aggregate analysis data
            repositories = self._get_repositories(document, repository_ids)
            aggregated_context = self._aggregate_repository_context(repositories)

            # Get document type name and stage name
            doc_type_name = document.document_type.name if document.document_type else "Technical Documentation"
            stage_name = document.stage.name if document.stage else None

            # Generate content for each included section
            for section in document.sections:
                if not section.is_included:
                    continue

                try:
                    content, used_placeholder = self._generate_section_content(
                        section=section,
                        repositories=repositories,
                        aggregated_context=aggregated_context,
                        doc_type_name=doc_type_name,
                        stage_name=stage_name,
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

    def regenerate_section(
        self,
        document_id: str,
        section_id: str,
        repository_ids: Optional[list[str]] = None,
        custom_prompt: Optional[str] = None,
    ) -> dict:
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
        repositories = self._get_repositories(document, repository_ids)
        aggregated_context = self._aggregate_repository_context(repositories)
        doc_type_name = document.document_type.name if document.document_type else "Technical Documentation"
        stage_name = document.stage.name if document.stage else None

        content, used_placeholder = self._generate_section_content(
            section=section,
            repositories=repositories,
            aggregated_context=aggregated_context,
            doc_type_name=doc_type_name,
            stage_name=stage_name,
            custom_prompt=custom_prompt,
        )

        generated = self._save_content(section_id, content)

        return {
            'section_id': str(section.id),
            'title': section.title,
            'content_id': str(generated.id),
            'content': content,
            'used_placeholder': used_placeholder,
        }

    def _get_repositories(
        self,
        document: Document,
        repository_ids: Optional[list[str]] = None,
    ) -> list[Project]:
        """Get repositories to use for generation.

        Priority:
        1. Explicit repository_ids if provided
        2. All repositories from the document's SDLC project
        3. All repositories from the primary project's SDLC project
        4. Just the document's primary project
        """
        if repository_ids:
            # Use explicitly specified repositories
            return (
                self.db.query(Project)
                .filter(Project.id.in_(repository_ids))
                .all()
            )

        # Check if document has a direct SDLC project reference
        if document.sdlc_project_id:
            sdlc_project = document.sdlc_project
            if sdlc_project and sdlc_project.repositories:
                return list(sdlc_project.repositories)

        primary_project = document.project

        # If no primary project, we have no repositories
        if not primary_project:
            return []

        # Check if primary project is part of an SDLC project
        if primary_project.sdlc_project_id:
            sdlc_project = primary_project.sdlc_project
            if sdlc_project and sdlc_project.repositories:
                return list(sdlc_project.repositories)

        return [primary_project]

    def _aggregate_repository_context(self, repositories: list[Project]) -> dict[str, Any]:
        """Aggregate analysis data and context from multiple repositories."""
        if not repositories:
            return {
                'primary_language': None,
                'repositories': [],
                'is_multi_repo': False,
            }

        if len(repositories) == 1:
            repo = repositories[0]
            return {
                'primary_language': repo.analysis_data.get('primary_language') if repo.analysis_data else None,
                'repositories': [{
                    'name': repo.name,
                    'type': repo.repo_type or 'main',
                    'analysis': repo.analysis_data or {},
                    'code_path': self._get_code_path(repo),
                }],
                'is_multi_repo': False,
            }

        # Aggregate from multiple repositories
        aggregated = {
            'primary_language': None,
            'repositories': [],
            'is_multi_repo': True,
            'languages': {},
            'combined_structure': {
                'total_files': 0,
                'total_dirs': 0,
                'total_lines': 0,
            },
        }

        for repo in repositories:
            analysis = repo.analysis_data or {}
            repo_info = {
                'name': repo.name,
                'type': repo.repo_type or 'unknown',
                'analysis': analysis,
                'code_path': self._get_code_path(repo),
            }
            aggregated['repositories'].append(repo_info)

            # Aggregate languages
            if analysis.get('languages'):
                for lang, count in analysis['languages'].items():
                    aggregated['languages'][lang] = aggregated['languages'].get(lang, 0) + count

            # Aggregate structure
            if analysis.get('structure'):
                structure = analysis['structure']
                aggregated['combined_structure']['total_files'] += structure.get('total_files', 0)
                aggregated['combined_structure']['total_dirs'] += structure.get('total_dirs', 0)
                aggregated['combined_structure']['total_lines'] += structure.get('total_lines', 0)

        # Determine primary language from aggregated data
        if aggregated['languages']:
            aggregated['primary_language'] = max(aggregated['languages'], key=aggregated['languages'].get)

        return aggregated

    def _get_code_path(self, project: Project) -> str:
        """Get the path to the code files."""
        if project.source_type == "upload":
            return os.path.join(project.storage_path, "code")
        return project.storage_path

    def _generate_section_content(
        self,
        section: DocumentSection,
        repositories: list[Project],
        aggregated_context: dict[str, Any],
        doc_type_name: str,
        stage_name: str = None,
        custom_prompt: str = None,
    ) -> tuple[str, bool]:
        """Generate content for a single section.

        Returns:
            tuple: (content, used_placeholder) - content string and whether placeholder was used
        """
        # Get relevant files from all repositories
        all_relevant_files = []

        for repo_info in aggregated_context['repositories']:
            relevant_files = self.code_analyzer.get_relevant_files_for_section(
                repo_info['code_path'],
                section.title,
                repo_info['analysis'],
                max_files=3 if aggregated_context['is_multi_repo'] else 5,
            )

            for file_info in relevant_files:
                file_info['repository'] = repo_info['name']
                file_info['repo_type'] = repo_info['type']
                all_relevant_files.append(file_info)

        # Build code context with repository attribution
        code_context = self._build_code_context(all_relevant_files, aggregated_context)

        try:
            # Use custom prompt if provided, otherwise use section description
            description = custom_prompt if custom_prompt else section.description

            # Generate content using Claude with stage awareness
            content = self.claude_service.generate_section_content(
                section_title=section.title,
                section_description=description,
                code_context=code_context,
                document_type=doc_type_name,
                stage_name=stage_name,
            )
            return content, False
        except Exception as e:
            # Fallback: generate placeholder content when AI fails
            print(f"AI generation failed for section '{section.title}': {e}")
            return self._generate_placeholder_content(section, aggregated_context, all_relevant_files), True

    def _build_code_context(
        self,
        relevant_files: list[dict],
        aggregated_context: dict[str, Any],
    ) -> str:
        """Build code context string from relevant files."""
        if not relevant_files:
            return "No specific code files found for this section. Generate based on general project structure."

        context_parts = []

        # Add multi-repo overview if applicable
        if aggregated_context['is_multi_repo']:
            repo_summary = "Project consists of multiple repositories:\n"
            for repo_info in aggregated_context['repositories']:
                repo_type = repo_info['type']
                repo_name = repo_info['name']
                primary_lang = repo_info['analysis'].get('primary_language', 'Unknown')
                repo_summary += f"  - {repo_name} ({repo_type}): {primary_lang}\n"
            context_parts.append(repo_summary)

        # Group files by repository
        files_by_repo: dict[str, list[dict]] = {}
        for file_info in relevant_files:
            repo_name = file_info.get('repository', 'main')
            if repo_name not in files_by_repo:
                files_by_repo[repo_name] = []
            files_by_repo[repo_name].append(file_info)

        # Add files with repository context
        for repo_name, files in files_by_repo.items():
            if aggregated_context['is_multi_repo']:
                context_parts.append(f"\n=== Repository: {repo_name} ===")

            for file_info in files:
                context_parts.append(f"\n--- {file_info['path']} ---\n{file_info['content']}")

        return "\n".join(context_parts)

    def _generate_placeholder_content(
        self,
        section: DocumentSection,
        aggregated_context: dict[str, Any],
        relevant_files: list[dict],
    ) -> str:
        """Generate placeholder content when AI is unavailable."""
        content = f"## {section.title}\n\n"

        if section.description:
            content += f"{section.description}\n\n"

        content += "---\n\n"
        content += "*This section requires manual content. AI generation was unavailable.*\n\n"

        # Add multi-repo context if applicable
        if aggregated_context.get('is_multi_repo'):
            content += "### Project Structure:\n"
            content += "This project consists of multiple repositories:\n"
            for repo_info in aggregated_context['repositories']:
                content += f"- **{repo_info['name']}** ({repo_info['type']})\n"
            content += "\n"

        # Add helpful context based on section type
        title_lower = section.title.lower()

        if 'overview' in title_lower or 'introduction' in title_lower:
            content += "### Suggested Content:\n"
            content += "- Project purpose and goals\n"
            content += "- Key features and capabilities\n"
            content += "- Target audience\n"
            if aggregated_context.get('primary_language'):
                content += f"\n**Primary Language:** {aggregated_context.get('primary_language')}\n"

        elif 'architecture' in title_lower or 'design' in title_lower:
            content += "### Suggested Content:\n"
            content += "- System components and their relationships\n"
            content += "- Data flow diagrams\n"
            content += "- Technology stack decisions\n"

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

        # Add relevant files info with repository context
        if relevant_files:
            content += "\n### Relevant Files:\n"
            for f in relevant_files[:8]:
                repo_name = f.get('repository', '')
                if repo_name and aggregated_context.get('is_multi_repo'):
                    content += f"- `{f['path']}` (from {repo_name})\n"
                else:
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
