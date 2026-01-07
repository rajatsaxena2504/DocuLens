"""
File Analyzer Service - Analyze individual files for documentation.

Supports: Python, SQL, Jupyter notebooks, JavaScript/TypeScript
"""
import ast
import re
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class FunctionInfo:
    name: str
    args: List[str]
    docstring: Optional[str]
    decorators: List[str]
    returns: Optional[str]
    line_number: int
    is_async: bool = False


@dataclass
class ClassInfo:
    name: str
    bases: List[str]
    docstring: Optional[str]
    methods: List[str]
    line_number: int


@dataclass
class PythonAnalysis:
    file_path: str
    module_docstring: Optional[str]
    imports: List[str]
    from_imports: List[Dict[str, Any]]
    functions: List[FunctionInfo]
    classes: List[ClassInfo]
    global_variables: List[str]
    constants: List[str]
    entry_point: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_type": "python",
            "module_docstring": self.module_docstring,
            "imports": self.imports,
            "from_imports": self.from_imports,
            "functions": [asdict(f) for f in self.functions],
            "classes": [asdict(c) for c in self.classes],
            "global_variables": self.global_variables,
            "constants": self.constants,
            "entry_point": self.entry_point,
        }


@dataclass
class SQLAnalysis:
    file_path: str
    tables_referenced: List[str]
    tables_created: List[str]
    tables_modified: List[str]
    ctes: List[str]
    joins: List[str]
    aggregations: List[str]
    subqueries: int
    statement_types: List[str]
    comments: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_type": "sql",
            "tables_referenced": self.tables_referenced,
            "tables_created": self.tables_created,
            "tables_modified": self.tables_modified,
            "ctes": self.ctes,
            "joins": self.joins,
            "aggregations": self.aggregations,
            "subqueries": self.subqueries,
            "statement_types": self.statement_types,
            "comments": self.comments,
        }


@dataclass
class NotebookCell:
    cell_type: str  # code, markdown
    source: str
    outputs: List[str]
    execution_count: Optional[int]


@dataclass
class NotebookAnalysis:
    file_path: str
    title: Optional[str]
    total_cells: int
    code_cells: int
    markdown_cells: int
    imports: List[str]
    functions: List[str]
    visualizations: List[str]
    data_sources: List[str]
    headings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_type": "ipynb",
            "title": self.title,
            "total_cells": self.total_cells,
            "code_cells": self.code_cells,
            "markdown_cells": self.markdown_cells,
            "imports": self.imports,
            "functions": self.functions,
            "visualizations": self.visualizations,
            "data_sources": self.data_sources,
            "headings": self.headings,
        }


@dataclass
class JavaScriptAnalysis:
    file_path: str
    imports: List[str]
    exports: List[str]
    functions: List[FunctionInfo]
    classes: List[ClassInfo]
    constants: List[str]
    jsx_components: List[str]
    hooks_used: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_type": "javascript",
            "imports": self.imports,
            "exports": self.exports,
            "functions": [asdict(f) for f in self.functions],
            "classes": [asdict(c) for c in self.classes],
            "constants": self.constants,
            "jsx_components": self.jsx_components,
            "hooks_used": self.hooks_used,
        }


class FileAnalyzer:
    """Analyzer for individual source files."""

    def analyze(self, content: str, file_path: str) -> Dict[str, Any]:
        """Analyze file based on extension."""
        ext = file_path.lower().split('.')[-1] if '.' in file_path else ''

        if ext == 'py':
            return self.analyze_python(content, file_path)
        elif ext == 'sql':
            return self.analyze_sql(content, file_path)
        elif ext == 'ipynb':
            return self.analyze_notebook(content, file_path)
        elif ext in ('js', 'jsx', 'ts', 'tsx'):
            return self.analyze_javascript(content, file_path)
        else:
            return {"file_path": file_path, "file_type": "unknown", "error": f"Unsupported file type: {ext}"}

    def analyze_python(self, content: str, file_path: str) -> Dict[str, Any]:
        """Analyze Python file using AST."""
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            return {"file_path": file_path, "file_type": "python", "error": f"Syntax error: {e}"}

        analysis = PythonAnalysis(
            file_path=file_path,
            module_docstring=ast.get_docstring(tree),
            imports=[],
            from_imports=[],
            functions=[],
            classes=[],
            global_variables=[],
            constants=[],
        )

        for node in ast.walk(tree):
            # Imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    analysis.imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                names = [alias.name for alias in node.names]
                analysis.from_imports.append({"module": module, "names": names})

            # Functions
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                    # Only top-level and class methods
                    args = [arg.arg for arg in node.args.args]
                    decorators = [self._get_decorator_name(d) for d in node.decorator_list]
                    returns = ast.unparse(node.returns) if node.returns else None

                    func_info = FunctionInfo(
                        name=node.name,
                        args=args,
                        docstring=ast.get_docstring(node),
                        decorators=decorators,
                        returns=returns,
                        line_number=node.lineno,
                        is_async=isinstance(node, ast.AsyncFunctionDef),
                    )
                    analysis.functions.append(func_info)

            # Classes
            elif isinstance(node, ast.ClassDef):
                bases = [ast.unparse(base) for base in node.bases]
                methods = [n.name for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]

                class_info = ClassInfo(
                    name=node.name,
                    bases=bases,
                    docstring=ast.get_docstring(node),
                    methods=methods,
                    line_number=node.lineno,
                )
                analysis.classes.append(class_info)

        # Check for top-level assignments
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        name = target.id
                        if name.isupper():
                            analysis.constants.append(name)
                        else:
                            analysis.global_variables.append(name)

        # Check for entry point
        analysis.entry_point = 'if __name__ == "__main__"' in content or 'if __name__ == \'__main__\'' in content

        return analysis.to_dict()

    def _get_decorator_name(self, node) -> str:
        """Extract decorator name from AST node."""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return f"{self._get_decorator_name(node.value)}.{node.attr}"
        elif isinstance(node, ast.Call):
            return self._get_decorator_name(node.func)
        return ""

    def analyze_sql(self, content: str, file_path: str) -> Dict[str, Any]:
        """Analyze SQL file using regex patterns."""
        content_upper = content.upper()

        # Statement types
        statement_types = []
        if 'SELECT' in content_upper:
            statement_types.append('SELECT')
        if 'INSERT' in content_upper:
            statement_types.append('INSERT')
        if 'UPDATE' in content_upper:
            statement_types.append('UPDATE')
        if 'DELETE' in content_upper:
            statement_types.append('DELETE')
        if 'CREATE TABLE' in content_upper:
            statement_types.append('CREATE TABLE')
        if 'CREATE VIEW' in content_upper:
            statement_types.append('CREATE VIEW')
        if 'ALTER' in content_upper:
            statement_types.append('ALTER')
        if 'DROP' in content_upper:
            statement_types.append('DROP')

        # Tables referenced (FROM, JOIN clauses)
        tables_pattern = r'\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_\.]*)'
        tables_referenced = list(set(re.findall(tables_pattern, content, re.IGNORECASE)))

        # Tables created
        create_pattern = r'CREATE\s+(?:OR\s+REPLACE\s+)?(?:TEMP\s+|TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_\.]*)'
        tables_created = list(set(re.findall(create_pattern, content, re.IGNORECASE)))

        # Tables modified (INSERT, UPDATE, DELETE)
        modify_pattern = r'(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-zA-Z_][a-zA-Z0-9_\.]*)'
        tables_modified = list(set(re.findall(modify_pattern, content, re.IGNORECASE)))

        # CTEs
        cte_pattern = r'WITH\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\('
        ctes = re.findall(cte_pattern, content, re.IGNORECASE)

        # Joins
        join_pattern = r'\b((?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)?\s*JOIN)\b'
        joins = re.findall(join_pattern, content, re.IGNORECASE)
        joins = [j.strip() for j in joins if j.strip()]

        # Aggregations
        agg_pattern = r'\b(SUM|COUNT|AVG|MIN|MAX|GROUP_CONCAT|STRING_AGG)\s*\('
        aggregations = list(set(re.findall(agg_pattern, content, re.IGNORECASE)))

        # Subqueries (count nested SELECTs)
        subquery_count = len(re.findall(r'\(\s*SELECT', content, re.IGNORECASE))

        # Comments
        single_line = re.findall(r'--\s*(.+)$', content, re.MULTILINE)
        multi_line = re.findall(r'/\*(.+?)\*/', content, re.DOTALL)
        comments = single_line + [c.strip() for c in multi_line]

        analysis = SQLAnalysis(
            file_path=file_path,
            tables_referenced=tables_referenced,
            tables_created=tables_created,
            tables_modified=tables_modified,
            ctes=ctes,
            joins=joins,
            aggregations=aggregations,
            subqueries=subquery_count,
            statement_types=statement_types,
            comments=comments[:10],  # Limit comments
        )

        return analysis.to_dict()

    def analyze_notebook(self, content: str, file_path: str) -> Dict[str, Any]:
        """Analyze Jupyter notebook JSON."""
        try:
            nb = json.loads(content)
        except json.JSONDecodeError as e:
            return {"file_path": file_path, "file_type": "ipynb", "error": f"Invalid JSON: {e}"}

        cells = nb.get('cells', [])
        code_cells = [c for c in cells if c.get('cell_type') == 'code']
        markdown_cells = [c for c in cells if c.get('cell_type') == 'markdown']

        # Extract imports from code cells
        imports = []
        functions = []
        for cell in code_cells:
            source = ''.join(cell.get('source', []))
            # Imports
            for line in source.split('\n'):
                if line.strip().startswith('import ') or line.strip().startswith('from '):
                    imports.append(line.strip())
            # Function definitions
            func_matches = re.findall(r'^def\s+(\w+)\s*\(', source, re.MULTILINE)
            functions.extend(func_matches)

        # Detect visualizations
        visualizations = []
        vis_keywords = ['plt.', 'sns.', 'fig.', 'ax.', 'plotly', 'bokeh', 'altair']
        for cell in code_cells:
            source = ''.join(cell.get('source', []))
            for keyword in vis_keywords:
                if keyword in source:
                    visualizations.append(keyword.replace('.', ''))

        # Detect data sources
        data_sources = []
        data_patterns = [
            (r'pd\.read_csv\(["\']([^"\']+)', 'csv'),
            (r'pd\.read_excel\(["\']([^"\']+)', 'excel'),
            (r'pd\.read_sql', 'sql'),
            (r'requests\.get\(["\']([^"\']+)', 'api'),
        ]
        for cell in code_cells:
            source = ''.join(cell.get('source', []))
            for pattern, dtype in data_patterns:
                if re.search(pattern, source):
                    data_sources.append(dtype)

        # Extract headings from markdown
        headings = []
        for cell in markdown_cells:
            source = ''.join(cell.get('source', []))
            heading_matches = re.findall(r'^#+\s+(.+)$', source, re.MULTILINE)
            headings.extend(heading_matches)

        # Get title (first H1)
        title = None
        for h in headings:
            title = h
            break

        analysis = NotebookAnalysis(
            file_path=file_path,
            title=title,
            total_cells=len(cells),
            code_cells=len(code_cells),
            markdown_cells=len(markdown_cells),
            imports=list(set(imports))[:20],
            functions=list(set(functions)),
            visualizations=list(set(visualizations)),
            data_sources=list(set(data_sources)),
            headings=headings[:10],
        )

        return analysis.to_dict()

    def analyze_javascript(self, content: str, file_path: str) -> Dict[str, Any]:
        """Analyze JavaScript/TypeScript file using regex."""
        # Imports
        import_patterns = [
            r'import\s+.*?from\s+["\']([^"\']+)["\']',
            r'import\s*\(["\']([^"\']+)["\']\)',
            r'require\s*\(["\']([^"\']+)["\']\)',
        ]
        imports = []
        for pattern in import_patterns:
            imports.extend(re.findall(pattern, content))

        # Exports
        export_patterns = [
            r'export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)',
            r'export\s*\{\s*([^}]+)\s*\}',
            r'module\.exports\s*=',
        ]
        exports = []
        for pattern in export_patterns:
            matches = re.findall(pattern, content)
            for m in matches:
                if isinstance(m, str):
                    exports.extend([e.strip() for e in m.split(',')])

        # Functions
        func_pattern = r'(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)'
        arrow_pattern = r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>'

        functions = []
        for match in re.finditer(func_pattern, content):
            functions.append(FunctionInfo(
                name=match.group(1),
                args=[a.strip() for a in match.group(2).split(',') if a.strip()],
                docstring=None,
                decorators=[],
                returns=None,
                line_number=content[:match.start()].count('\n') + 1,
            ))

        for match in re.finditer(arrow_pattern, content):
            functions.append(FunctionInfo(
                name=match.group(1),
                args=[],
                docstring=None,
                decorators=[],
                returns=None,
                line_number=content[:match.start()].count('\n') + 1,
            ))

        # Classes
        class_pattern = r'class\s+(\w+)(?:\s+extends\s+(\w+))?'
        classes = []
        for match in re.finditer(class_pattern, content):
            classes.append(ClassInfo(
                name=match.group(1),
                bases=[match.group(2)] if match.group(2) else [],
                docstring=None,
                methods=[],
                line_number=content[:match.start()].count('\n') + 1,
            ))

        # Constants
        const_pattern = r'(?:const|let|var)\s+([A-Z][A-Z0-9_]+)\s*='
        constants = re.findall(const_pattern, content)

        # JSX Components (capitalized function components)
        jsx_pattern = r'(?:function|const)\s+([A-Z]\w+)'
        jsx_components = re.findall(jsx_pattern, content)

        # React hooks
        hook_pattern = r'\b(use[A-Z]\w+)\s*\('
        hooks_used = list(set(re.findall(hook_pattern, content)))

        analysis = JavaScriptAnalysis(
            file_path=file_path,
            imports=list(set(imports)),
            exports=list(set(exports)),
            functions=functions,
            classes=classes,
            constants=list(set(constants)),
            jsx_components=list(set(jsx_components)),
            hooks_used=hooks_used,
        )

        return analysis.to_dict()


# Singleton instance
file_analyzer = FileAnalyzer()
