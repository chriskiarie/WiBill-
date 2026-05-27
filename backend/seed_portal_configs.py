"""
seed_portal_configs.py - Initialize portal_config for all tenants
Location: backend/seed_portal_configs.py (in backend root)
Run from: cd backend && python seed_portal_configs.py

This script:
1. Loads all tenants
2. Creates complete portal_config with brand, design, network_awareness
3. Updates tenant.portal_config in the database
4. Sets default template to 'dashboard'
"""

import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update
import os

# Ensure imports work from backend root
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app.models.tenant import Tenant
from app.core.config import settings

# Color palettes
PALETTES = [
    {"name": "Midnight Indigo", "primary": "#5b4fff", "primaryDark": "rgba(91,79,255,.6)", "bg": "#0c0c1a", "text": "#e8e6ff", "textDim": "rgba(232,230,255,.5)", "card": "rgba(255,255,255,.06)", "cardBorder": "rgba(255,255,255,.12)", "accent": "#8b73ff"},
    {"name": "Nairobi Sun", "primary": "#f97316", "primaryDark": "#f97316", "bg": "#fff7ed", "text": "#431407", "textDim": "#a1520b", "card": "#ffffff", "cardBorder": "#fed7aa", "accent": "#ea6b03"},
    {"name": "Ocean Deep", "primary": "#0ea5e9", "primaryDark": "#0c4a6e", "bg": "#f0f9ff", "text": "#0c4a6e", "textDim": "#0369a1", "card": "#ffffff", "cardBorder": "#bae6fd", "accent": "#0284c7"},
    {"name": "Forest Night", "primary": "#16a34a", "primaryDark": "rgba(134,239,172,.5)", "bg": "#052e16", "text": "#dcfce7", "textDim": "rgba(220,252,231,.5)", "card": "rgba(255,255,255,.07)", "cardBorder": "rgba(134,239,172,.15)", "accent": "#22c55e"},
    {"name": "Rose Quartz", "primary": "#f43f5e", "primaryDark": "#f43f5e", "bg": "#fff1f2", "text": "#4c0519", "textDim": "#881337", "card": "#ffffff", "cardBorder": "#fecdd3", "accent": "#e11d48"},
    {"name": "Obsidian Slate", "primary": "#1e293b", "primaryDark": "#1e293b", "bg": "#f8fafc", "text": "#0f172a", "textDim": "#64748b", "card": "#ffffff", "cardBorder": "#e2e8f0", "accent": "#334155"},
    {"name": "Amber Dusk", "primary": "#b45309", "primaryDark": "#d97706", "bg": "#fffbeb", "text": "#451a03", "textDim": "#92400e", "card": "#ffffff", "cardBorder": "#fde68a", "accent": "#d97706"},
    {"name": "Electric Violet", "primary": "#7c3aed", "primaryDark": "#7c3aed", "bg": "#faf5ff", "text": "#2e1065", "textDim": "#6d28d9", "card": "#ffffff", "cardBorder": "#ddd6fe", "accent": "#6d28d9"},
]

def create_default_portal_config(tenant_id: int, tenant_name: str, palette_index: int = 0):
    """Create a complete portal config for a tenant"""
    return {
        "template_id": "dashboard",  # Default template
        "brand": {
            "name": tenant_name,
            "emoji": "📡",
            "tagline": f"Fast, reliable internet by {tenant_name}",
            "location": "Nairobi, Kenya",
            "support_phone": "+254 700 123 456",
        },
        "design": {
            "palette_index": palette_index % len(PALETTES),
            "font_family": "Syne",
            "card_radius": "16px",
        },
        "network_awareness": {
            "show_status_banner": True,
            "custom_status_message": "✅ Network is online and stable",
        }
    }

async def seed_portal_configs():
    """Seed portal_config for all tenants"""
    
    try:
        # Create async engine
        engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            future=True
        )
        
        async_session = sessionmaker(
            engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        async with async_session() as session:
            print("🔄 Loading tenants...")
            
            # Get all tenants
            result = await session.execute(select(Tenant))
            tenants = result.scalars().all()
            
            if not tenants:
                print("❌ No tenants found! Run seed.py first.")
                await engine.dispose()
                return False
            
            print(f"✅ Found {len(tenants)} tenant(s)\n")
            
            # Seed each tenant
            for idx, tenant in enumerate(tenants):
                if not tenant.portal_config:
                    config = create_default_portal_config(
                        tenant.id,
                        tenant.name,
                        palette_index=idx
                    )
                    
                    # Update tenant
                    stmt = update(Tenant).where(Tenant.id == tenant.id).values(
                        portal_config=config
                    )
                    await session.execute(stmt)
                    
                    palette_name = PALETTES[config['design']['palette_index']]['name']
                    print(f"✅ {tenant.slug:20} → {config['template_id']:15} | Palette: {palette_name}")
                else:
                    print(f"⏭️  {tenant.slug:20} → Already configured")
            
            await session.commit()
            print("\n✨ Portal configs seeded successfully!")
            await engine.dispose()
            return True
    
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}")
        print(f"   {str(e)}")
        print("\n📋 Troubleshooting:")
        print("   1. Verify you're in backend/ directory: pwd")
        print("   2. Check DATABASE_URL in .env is valid")
        print("   3. Ensure PostgreSQL is running: psql --version")
        return False

if __name__ == "__main__":
    success = asyncio.run(seed_portal_configs())
    exit(0 if success else 1)