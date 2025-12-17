"""Unified AI service with multi-provider support.

Priority order:
1. Ollama / LM Studio (local models) - if OLLAMA_BASE_URL is set
2. Databricks Foundation Models - if DATABRICKS_HOST and DATABRICKS_TOKEN are set
3. Google Gemini - if GEMINI_API_KEY is set
4. Anthropic Claude - if ANTHROPIC_API_KEY is set
5. Placeholder content (fallback)
"""
import json
import requests
from typing import Optional
from app.config import settings


class AIService:
    """Unified AI service supporting multiple providers."""

    def __init__(self):
        self.active_provider: Optional[str] = None
        self.ollama_client = None
        self.databricks_client = None
        self.gemini_client = None
        self.anthropic_client = None
        self._init_clients()

    def _init_clients(self):
        """Initialize available AI clients in priority order."""

        # 1. Try Ollama / LM Studio (highest priority - local models)
        if settings.ollama_base_url:
            try:
                # Test connection to Ollama
                test_url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
                # For LM Studio (OpenAI compatible), use /v1/models
                if "/v1" in settings.ollama_base_url:
                    test_url = f"{settings.ollama_base_url.rstrip('/')}/models"

                response = requests.get(test_url, timeout=5)
                if response.status_code == 200:
                    self.ollama_client = {
                        "base_url": settings.ollama_base_url.rstrip('/'),
                        "model": settings.ollama_model,
                        "is_openai_compatible": "/v1" in settings.ollama_base_url,
                    }
                    self.active_provider = "ollama"
                    print(f"AI Service: Ollama/LM Studio initialized (model: {settings.ollama_model})")
            except Exception as e:
                print(f"AI Service: Failed to connect to Ollama/LM Studio: {e}")

        # 2. Try Databricks Foundation Models
        if not self.active_provider and settings.databricks_host and settings.databricks_token:
            try:
                self.databricks_client = {
                    "host": settings.databricks_host.rstrip('/'),
                    "token": settings.databricks_token,
                    "model": settings.databricks_model,
                }
                # Test connection
                test_url = f"{self.databricks_client['host']}/api/2.0/serving-endpoints"
                headers = {"Authorization": f"Bearer {settings.databricks_token}"}
                response = requests.get(test_url, headers=headers, timeout=10)
                if response.status_code == 200:
                    self.active_provider = "databricks"
                    print(f"AI Service: Databricks initialized (model: {settings.databricks_model})")
                else:
                    self.databricks_client = None
            except Exception as e:
                print(f"AI Service: Failed to initialize Databricks: {e}")
                self.databricks_client = None

        # 3. Try Gemini
        if not self.active_provider and settings.gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                self.gemini_client = genai.GenerativeModel(settings.gemini_model)
                self.active_provider = "gemini"
                print(f"AI Service: Gemini initialized (model: {settings.gemini_model})")
            except Exception as e:
                print(f"AI Service: Failed to initialize Gemini: {e}")

        # 4. Try Anthropic (lowest priority among paid APIs)
        if not self.active_provider and settings.anthropic_api_key:
            try:
                from anthropic import Anthropic
                self.anthropic_client = Anthropic(api_key=settings.anthropic_api_key)
                self.active_provider = "anthropic"
                print(f"AI Service: Anthropic initialized (model: {settings.anthropic_model})")
            except Exception as e:
                print(f"AI Service: Failed to initialize Anthropic: {e}")

        if not self.active_provider:
            print("AI Service: No AI provider available - will use placeholder content")

    def get_active_provider(self) -> Optional[str]:
        """Return the currently active AI provider name."""
        return self.active_provider

    def generate_content(self, prompt: str, system_prompt: str = "") -> str:
        """Generate content using the active AI provider."""

        # Try providers in priority order (active provider first, then fallbacks)
        providers = [
            ("ollama", self.ollama_client, self._generate_with_ollama),
            ("databricks", self.databricks_client, self._generate_with_databricks),
            ("gemini", self.gemini_client, self._generate_with_gemini),
            ("anthropic", self.anthropic_client, self._generate_with_anthropic),
        ]

        # Reorder to try active provider first
        if self.active_provider:
            providers = sorted(providers, key=lambda x: x[0] != self.active_provider)

        for name, client, generate_fn in providers:
            if client:
                try:
                    return generate_fn(prompt, system_prompt)
                except Exception as e:
                    print(f"{name.capitalize()} generation failed: {e}")

        # All failed - raise to trigger placeholder
        raise Exception("No AI provider available or all providers failed")

    def _generate_with_ollama(self, prompt: str, system_prompt: str = "") -> str:
        """Generate content using Ollama or LM Studio."""
        client = self.ollama_client

        if client["is_openai_compatible"]:
            # LM Studio / OpenAI-compatible API
            url = f"{client['base_url']}/chat/completions"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            response = requests.post(
                url,
                json={
                    "model": client["model"],
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 4096,
                },
                timeout=120,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        else:
            # Native Ollama API
            url = f"{client['base_url']}/api/generate"
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

            response = requests.post(
                url,
                json={
                    "model": client["model"],
                    "prompt": full_prompt,
                    "stream": False,
                },
                timeout=120,
            )
            response.raise_for_status()
            return response.json()["response"]

    def _generate_with_databricks(self, prompt: str, system_prompt: str = "") -> str:
        """Generate content using Databricks Foundation Models."""
        client = self.databricks_client
        url = f"{client['host']}/serving-endpoints/{client['model']}/invocations"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {client['token']}",
                "Content-Type": "application/json",
            },
            json={
                "messages": messages,
                "max_tokens": 4096,
                "temperature": 0.7,
            },
            timeout=120,
        )
        response.raise_for_status()
        result = response.json()

        # Handle different response formats
        if "choices" in result:
            return result["choices"][0]["message"]["content"]
        elif "predictions" in result:
            return result["predictions"][0]
        else:
            return str(result)

    def _generate_with_gemini(self, prompt: str, system_prompt: str = "") -> str:
        """Generate content using Google Gemini."""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = self.gemini_client.generate_content(full_prompt)
        return response.text

    def _generate_with_anthropic(self, prompt: str, system_prompt: str = "") -> str:
        """Generate content using Anthropic Claude."""
        kwargs = {
            "model": settings.anthropic_model,
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = self.anthropic_client.messages.create(**kwargs)
        return response.content[0].text

    def suggest_sections(
        self,
        document_type: str,
        code_analysis: dict,
        available_sections: list[dict],
    ) -> list[dict]:
        """Use AI to suggest relevant sections for documentation."""
        system_prompt = """You are a technical documentation expert. Analyze the code and suggest the most relevant sections for documentation.
Return a JSON array of suggested sections with relevance scores."""

        sections_list = "\n".join([f"- {s['name']}: {s['description']}" for s in available_sections])

        prompt = f"""Based on this code analysis, suggest the most relevant documentation sections.

Document Type: {document_type}

Code Analysis:
- Primary Language: {code_analysis.get('primary_language', 'Unknown')}
- Frameworks: {', '.join(code_analysis.get('frameworks', []))}
- Has Tests: {code_analysis.get('has_tests', False)}
- Has API: {code_analysis.get('has_api', False)}
- File Count: {code_analysis.get('structure', {}).get('total_files', 0)}

Available Sections:
{sections_list}

Return a JSON array with objects containing:
- name: section name (must match available sections exactly)
- relevance_score: 0.0 to 1.0
- reason: brief explanation

Only include sections with relevance_score >= 0.5. Return ONLY valid JSON array, no other text."""

        try:
            response = self.generate_content(prompt, system_prompt)
            # Parse JSON from response
            json_str = response.strip()
            if json_str.startswith("```"):
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            return json.loads(json_str)
        except Exception as e:
            print(f"AI section suggestion failed: {e}")
            return []

    def generate_section_content(
        self,
        section_title: str,
        section_description: str,
        code_context: str,
        document_type: str,
        stage_name: str = None,
    ) -> str:
        """Generate content for a documentation section."""
        # Check if this is a multi-repo context
        is_multi_repo = "multiple repositories" in code_context.lower() or "=== Repository:" in code_context

        # Stage-specific guidance
        stage_guidance = self._get_stage_guidance(stage_name) if stage_name else ""

        if is_multi_repo:
            system_prompt = f"""You are a technical writer creating {document_type} documentation for a project with multiple repositories.
{stage_guidance}
Write clear, professional documentation that:
- Is well-structured with proper markdown formatting
- Covers how different parts of the system (frontend, backend, API, etc.) work together
- References specific repositories when discussing their code or functionality
- Is technically accurate based on the code provided
- Includes cross-repository relationships where relevant
- Uses code examples from appropriate repositories"""
        else:
            system_prompt = f"""You are a technical writer creating {document_type} documentation.
{stage_guidance}
Write clear, professional documentation that is:
- Well-structured with proper markdown formatting
- Technically accurate based on the code provided
- Concise but comprehensive
- Includes code examples where relevant"""

        prompt = f"""Write the "{section_title}" section for this documentation.

Section Purpose: {section_description}

Relevant Code:
{code_context}

Write professional documentation content in markdown format. Include:
- Clear explanations
- Code examples where helpful
- Any relevant warnings or notes
{"- Reference specific repositories when discussing their code" if is_multi_repo else ""}

Do not include the section title as a header (it will be added separately)."""

        return self.generate_content(prompt, system_prompt)

    def _get_stage_guidance(self, stage_name: str) -> str:
        """Get stage-specific writing guidance."""
        stage_guidance = {
            "Requirements": """
This is a REQUIREMENTS stage document. Focus on:
- Business objectives and stakeholder needs
- Functional and non-functional requirements
- User stories and acceptance criteria
- Scope boundaries and constraints
- Success metrics and KPIs
Write for business stakeholders and product managers.""",

            "Design": """
This is a DESIGN stage document. Focus on:
- System architecture and component design
- Data models and database schemas
- API contracts and interfaces
- UI/UX design decisions
- Design patterns and principles used
Write for architects, senior developers, and technical leads.""",

            "Development": """
This is a DEVELOPMENT stage document. Focus on:
- Implementation details and code structure
- Setup and configuration instructions
- Coding standards and conventions
- Development workflows and tools
- Integration points between components
Write for developers who will implement and maintain the code.""",

            "Testing": """
This is a TESTING stage document. Focus on:
- Test strategies and methodologies
- Test case specifications
- Test data requirements
- Quality metrics and coverage goals
- Bug tracking and resolution workflows
Write for QA engineers and developers.""",

            "Deployment": """
This is a DEPLOYMENT stage document. Focus on:
- Infrastructure requirements
- Deployment procedures and checklists
- Environment configurations
- Monitoring and alerting setup
- Rollback procedures
Write for DevOps engineers and system administrators.""",

            "Maintenance": """
This is a MAINTENANCE stage document. Focus on:
- Operational procedures and runbooks
- Incident response workflows
- Performance monitoring
- Upgrade and migration paths
- Support escalation procedures
Write for operations teams and support engineers.""",
        }

        return stage_guidance.get(stage_name, "")


# Singleton instance
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get or create the AI service singleton."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
