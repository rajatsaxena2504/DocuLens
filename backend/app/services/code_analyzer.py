import os
import re
from typing import Any
from pathlib import Path
from collections import defaultdict


class CodeAnalyzer:
    """Analyzes codebase structure and extracts relevant information."""

    # Directories to skip
    SKIP_DIRS = {
        'node_modules', 'venv', '.venv', '__pycache__', '.git', '.svn',
        'dist', 'build', '.next', '.nuxt', 'vendor', 'target', 'bin', 'obj',
        '.idea', '.vscode', 'coverage', '.pytest_cache', '.mypy_cache',
    }

    # File extensions by language
    LANGUAGE_EXTENSIONS = {
        'python': ['.py'],
        'javascript': ['.js', '.jsx', '.mjs'],
        'typescript': ['.ts', '.tsx'],
        'java': ['.java'],
        'go': ['.go'],
        'rust': ['.rs'],
        'c': ['.c', '.h'],
        'cpp': ['.cpp', '.hpp', '.cc', '.cxx'],
        'csharp': ['.cs'],
        'ruby': ['.rb'],
        'php': ['.php'],
        'swift': ['.swift'],
        'kotlin': ['.kt', '.kts'],
        'scala': ['.scala'],
        'html': ['.html', '.htm'],
        'css': ['.css', '.scss', '.sass', '.less'],
        'sql': ['.sql'],
        'shell': ['.sh', '.bash'],
        'yaml': ['.yml', '.yaml'],
        'json': ['.json'],
        'markdown': ['.md', '.markdown'],
        'xml': ['.xml'],
    }

    # Important configuration files
    CONFIG_FILES = {
        'package.json', 'package-lock.json', 'yarn.lock',
        'requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py',
        'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle',
        'Gemfile', 'composer.json',
        'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
        '.env.example', '.env.sample',
        'Makefile', 'CMakeLists.txt',
        'tsconfig.json', 'webpack.config.js', 'vite.config.ts', 'vite.config.js',
        '.eslintrc', '.prettierrc', '.editorconfig',
        'README.md', 'README.rst', 'README.txt',
        'LICENSE', 'LICENSE.md', 'LICENSE.txt',
    }

    def __init__(self):
        # Create extension to language mapping
        self.ext_to_language = {}
        for lang, exts in self.LANGUAGE_EXTENSIONS.items():
            for ext in exts:
                self.ext_to_language[ext] = lang

    def analyze_repository(self, path: str) -> dict[str, Any]:
        """Analyze a repository and return structured information.

        Alias for analyze() - used when adding repositories to SDLC projects.
        """
        return self.analyze(path)

    def analyze(self, path: str) -> dict[str, Any]:
        """Analyze a codebase and return structured information."""
        path = Path(path)
        if not path.exists():
            raise ValueError(f"Path does not exist: {path}")

        result = {
            "file_tree": [],
            "languages": defaultdict(int),
            "config_files": [],
            "entry_points": [],
            "structure": {
                "total_files": 0,
                "total_dirs": 0,
                "total_lines": 0,
            },
            "key_files": [],
            "dependencies": {},
        }

        # Walk through the directory
        for root, dirs, files in os.walk(path):
            # Skip unwanted directories
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS]

            rel_root = os.path.relpath(root, path)
            if rel_root == '.':
                rel_root = ''

            result["structure"]["total_dirs"] += 1

            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.join(rel_root, file) if rel_root else file

                result["file_tree"].append(rel_path)
                result["structure"]["total_files"] += 1

                # Get file extension
                ext = os.path.splitext(file)[1].lower()

                # Count by language
                if ext in self.ext_to_language:
                    lang = self.ext_to_language[ext]
                    result["languages"][lang] += 1

                    # Count lines for code files
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.readlines())
                            result["structure"]["total_lines"] += lines
                    except Exception:
                        pass

                # Check for config files
                if file in self.CONFIG_FILES:
                    result["config_files"].append(rel_path)
                    result["key_files"].append({
                        "path": rel_path,
                        "type": "config",
                        "name": file,
                    })

                # Check for entry points
                if file in ['main.py', 'app.py', 'index.js', 'index.ts', 'main.go', 'main.rs', 'Main.java']:
                    result["entry_points"].append(rel_path)
                    result["key_files"].append({
                        "path": rel_path,
                        "type": "entry_point",
                        "name": file,
                    })

        # Parse dependency files
        result["dependencies"] = self._extract_dependencies(path, result["config_files"])

        # Convert defaultdict to regular dict for JSON serialization
        result["languages"] = dict(result["languages"])

        # Sort files
        result["file_tree"].sort()
        result["config_files"].sort()

        # Detect primary language
        if result["languages"]:
            result["primary_language"] = max(result["languages"], key=result["languages"].get)
        else:
            result["primary_language"] = "unknown"

        return result

    def _extract_dependencies(self, base_path: Path, config_files: list) -> dict:
        """Extract dependencies from configuration files."""
        deps = {}

        for config_file in config_files:
            file_path = base_path / config_file
            if not file_path.exists():
                continue

            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')

                if config_file == 'package.json':
                    import json
                    data = json.loads(content)
                    deps['npm'] = {
                        'dependencies': list(data.get('dependencies', {}).keys()),
                        'devDependencies': list(data.get('devDependencies', {}).keys()),
                    }

                elif config_file == 'requirements.txt':
                    packages = []
                    for line in content.split('\n'):
                        line = line.strip()
                        if line and not line.startswith('#'):
                            # Extract package name (before ==, >=, etc.)
                            pkg = re.split(r'[<>=!~]', line)[0].strip()
                            if pkg:
                                packages.append(pkg)
                    deps['pip'] = packages

                elif config_file == 'pyproject.toml':
                    # Basic extraction - look for dependencies section
                    in_deps = False
                    packages = []
                    for line in content.split('\n'):
                        if '[project.dependencies]' in line or '[tool.poetry.dependencies]' in line:
                            in_deps = True
                        elif line.startswith('[') and in_deps:
                            in_deps = False
                        elif in_deps and '=' in line:
                            pkg = line.split('=')[0].strip().strip('"')
                            if pkg and pkg != 'python':
                                packages.append(pkg)
                    if packages:
                        deps['python'] = packages

                elif config_file == 'go.mod':
                    packages = []
                    for line in content.split('\n'):
                        if line.strip().startswith('require'):
                            continue
                        if '/' in line and not line.strip().startswith('//'):
                            pkg = line.strip().split()[0]
                            if pkg:
                                packages.append(pkg)
                    if packages:
                        deps['go'] = packages

            except Exception:
                continue

        return deps

    def get_file_content(self, base_path: str, file_path: str, max_lines: int = 500) -> str:
        """Get content of a specific file."""
        full_path = os.path.join(base_path, file_path)
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()[:max_lines]
                return ''.join(lines)
        except Exception:
            return ""

    def get_relevant_files_for_section(
        self,
        base_path: str,
        section_name: str,
        analysis_data: dict,
        max_files: int = 10,
    ) -> list[dict]:
        """Get files relevant to a specific documentation section."""
        relevant = []

        # Map sections to file patterns
        section_patterns = {
            'installation': ['README', 'INSTALL', 'setup.py', 'package.json', 'requirements.txt'],
            'api': ['api', 'routes', 'endpoints', 'controllers', 'handlers'],
            'configuration': ['config', 'settings', '.env', 'conf'],
            'architecture': ['main', 'app', 'index', 'core', 'src'],
            'database': ['models', 'schema', 'migrations', 'database', 'db'],
            'testing': ['test', 'spec', '__tests__'],
            'deployment': ['Dockerfile', 'docker-compose', 'kubernetes', 'k8s', 'deploy'],
        }

        section_lower = section_name.lower()
        patterns = []

        # Find matching patterns
        for key, pats in section_patterns.items():
            if key in section_lower:
                patterns.extend(pats)

        # If no specific patterns, use entry points and config files
        if not patterns:
            patterns = ['main', 'app', 'index', 'README']

        # Search through file tree
        for file_path in analysis_data.get('file_tree', []):
            file_lower = file_path.lower()
            for pattern in patterns:
                if pattern.lower() in file_lower:
                    content = self.get_file_content(base_path, file_path, max_lines=200)
                    if content:
                        relevant.append({
                            'path': file_path,
                            'content': content,
                        })
                    break

            if len(relevant) >= max_files:
                break

        return relevant
