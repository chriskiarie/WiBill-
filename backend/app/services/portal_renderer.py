"""
app/services/portal_renderer.py - Renders Jinja2 templates with data
"""
from pathlib import Path
from jinja2 import Template, FileSystemLoader, Environment

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"

class PortalRenderer:
    """Renders portal HTML templates with Jinja2"""
    
    @staticmethod
    def load_template(filename: str) -> str:
        """Load template file content"""
        filepath = TEMPLATE_DIR / filename
        if not filepath.exists():
            raise FileNotFoundError(f"Template not found: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    
    @staticmethod
    def render(template_filename: str, context: dict) -> str:
        """
        Render a template with Jinja2
        
        Args:
            template_filename: Name of template file (e.g., 'portal_dashboard.html')
            context: Dict of variables to pass to template
        
        Returns:
            Rendered HTML string
        """
        try:
            template_content = PortalRenderer.load_template(template_filename)
            template = Template(template_content)
            return template.render(**context)
        except Exception as e:
            raise Exception(f"Error rendering template {template_filename}: {str(e)}")