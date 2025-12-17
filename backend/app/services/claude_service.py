"""Claude service - now using unified AI service with Gemini priority."""
from typing import Any
from app.services.ai_service import get_ai_service


class ClaudeService:
    """Service for AI content generation.

    Uses unified AI service which prioritizes:
    1. Gemini (if GEMINI_API_KEY set)
    2. Anthropic Claude (if ANTHROPIC_API_KEY set)
    3. Raises exception (triggers placeholder content)
    """

    def __init__(self):
        self.ai_service = get_ai_service()

    def generate_content(
        self,
        prompt: str,
        system_prompt: str = None,
        max_tokens: int = None,
    ) -> str:
        """Generate content using available AI provider."""
        return self.ai_service.generate_content(prompt, system_prompt or "")

    def suggest_sections(
        self,
        document_type: str,
        code_analysis: dict[str, Any],
        available_sections: list[dict],
    ) -> list[dict]:
        """Use AI to suggest relevant sections for a document."""
        return self.ai_service.suggest_sections(
            document_type=document_type,
            code_analysis=code_analysis,
            available_sections=available_sections,
        )

    def generate_section_content(
        self,
        section_title: str,
        section_description: str,
        code_context: str,
        document_type: str,
        stage_name: str = None,
    ) -> str:
        """Generate content for a specific documentation section."""
        return self.ai_service.generate_section_content(
            section_title=section_title,
            section_description=section_description,
            code_context=code_context,
            document_type=document_type,
            stage_name=stage_name,
        )
