"""Template gallery definitions for the Portal Design Studio."""

TEMPLATE_GALLERY = [
    # ── Business ──────────────────────────────────────────────────────────────
    {
        "id": "executive-dark",
        "name": "Executive Dark",
        "category": "business",
        "description": "Premium dark theme for corporate ISPs",
        "badge": "Popular",
        "tags": ["Best for ISPs"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#E8B84B",
                "secondary_color": "#1a1a2e",
                "accent_color": "#f0c27a",
                "background_type": "solid",
                "background_value": "#0f0f1a",
                "overlay_opacity": 0.4,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 36,
                "body_size": 16,
                "font_weight": 600,
                "letter_spacing": 0.5,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 16, "elevation": 0, "size": "compact"},
        }
    },
    {
        "id": "executive-light",
        "name": "Executive Light",
        "category": "business",
        "description": "Clean light theme for professional services",
        "badge": "New",
        "tags": ["Best for Offices"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#2D3436",
                "secondary_color": "#f5f6fa",
                "accent_color": "#0984e3",
                "background_type": "solid",
                "background_value": "#ffffff",
                "overlay_opacity": 0.1,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 32,
                "body_size": 15,
                "font_weight": 500,
                "letter_spacing": 0.3,
                "heading_case": "normal",
            },
            "card": {"style": "outline", "radius": 12, "elevation": 0, "size": "comfortable"},
        }
    },
    {
        "id": "premium-hotel",
        "name": "Premium Hotel",
        "category": "business",
        "description": "Luxurious theme for hotels and resorts",
        "badge": "Trending",
        "tags": ["Best for Hotels"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#C9A96E",
                "secondary_color": "#1c1c1c",
                "accent_color": "#e8d5a3",
                "background_type": "gradient",
                "background_value": "#1a1410",
                "gradient": "linear-gradient(135deg, #1a1410 0%, #2d2318 100%)",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "pill",
            },
            "typography": {
                "font_family": "Playfair Display",
                "heading_size": 42,
                "body_size": 16,
                "font_weight": 400,
                "letter_spacing": 1.0,
                "heading_case": "uppercase",
            },
            "card": {"style": "minimal", "radius": 8, "elevation": 0, "size": "large"},
        }
    },
    {
        "id": "modern-isp",
        "name": "Modern ISP",
        "category": "business",
        "description": "Bold modern theme for tech-forward ISPs",
        "badge": "Popular",
        "tags": ["Best for ISPs"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#00E676",
                "secondary_color": "#0d1117",
                "accent_color": "#58a6ff",
                "background_type": "solid",
                "background_value": "#0d1117",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 34,
                "body_size": 15,
                "font_weight": 600,
                "letter_spacing": 0.2,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 14, "elevation": 1, "size": "comfortable"},
        }
    },
    {
        "id": "corporate-blue",
        "name": "Corporate Blue",
        "category": "business",
        "description": "Trustworthy blue theme for enterprise",
        "badge": None,
        "tags": ["Best for Enterprises"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#1a73e8",
                "secondary_color": "#1e1e2f",
                "accent_color": "#8ab4f8",
                "background_type": "solid",
                "background_value": "#1e1e2f",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "IBM Plex Sans",
                "heading_size": 30,
                "body_size": 15,
                "font_weight": 500,
                "letter_spacing": 0.2,
                "heading_case": "normal",
            },
            "card": {"style": "outline", "radius": 10, "elevation": 0, "size": "compact"},
        }
    },
    # ── Entertainment ─────────────────────────────────────────────────────────
    {
        "id": "gaming-neon",
        "name": "Gaming Neon",
        "category": "entertainment",
        "description": "Cyberpunk neon theme for gaming zones",
        "badge": "Trending",
        "tags": ["Best for Gamers"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#ff00ff",
                "secondary_color": "#0a001a",
                "accent_color": "#00ffff",
                "background_type": "solid",
                "background_value": "#0a001a",
                "overlay_opacity": 0.4,
                "overlay_color": "#000000",
                "button_style": "sharp",
            },
            "typography": {
                "font_family": "Orbitron",
                "heading_size": 38,
                "body_size": 15,
                "font_weight": 700,
                "letter_spacing": 2.0,
                "heading_case": "uppercase",
            },
            "card": {"style": "glass", "radius": 4, "elevation": 2, "size": "compact"},
        }
    },
    {
        "id": "cyberpunk",
        "name": "Cyberpunk",
        "category": "entertainment",
        "description": "Dark futuristic theme with vibrant accents",
        "badge": None,
        "tags": ["Best for Cafes"],
        "base_template": "stories.html",
        "preset": {
            "theme": {
                "primary_color": "#ff6b35",
                "secondary_color": "#0d0d0d",
                "accent_color": "#ffd700",
                "background_type": "solid",
                "background_value": "#0d0d0d",
                "overlay_opacity": 0.5,
                "overlay_color": "#000000",
                "button_style": "sharp",
            },
            "typography": {
                "font_family": "Exo 2",
                "heading_size": 36,
                "body_size": 14,
                "font_weight": 700,
                "letter_spacing": 1.5,
                "heading_case": "uppercase",
            },
            "card": {"style": "floating", "radius": 8, "elevation": 3, "size": "compact"},
        }
    },
    {
        "id": "streaming-portal",
        "name": "Streaming Portal",
        "category": "entertainment",
        "description": "Netflix-inspired dark theme for entertainment venues",
        "badge": "Popular",
        "tags": ["Best for Hotels"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#e50914",
                "secondary_color": "#141414",
                "accent_color": "#ffffff",
                "background_type": "solid",
                "background_value": "#141414",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 32,
                "body_size": 16,
                "font_weight": 700,
                "letter_spacing": 0.3,
                "heading_case": "normal",
            },
            "card": {"style": "minimal", "radius": 4, "elevation": 0, "size": "comfortable"},
        }
    },
    {
        "id": "rgb-wave",
        "name": "RGB Wave",
        "category": "entertainment",
        "description": "Colorful RGB theme for tech events",
        "badge": "New",
        "tags": ["Best for Events"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#ff0080",
                "secondary_color": "#0a0a1a",
                "accent_color": "#7000ff",
                "background_type": "gradient",
                "background_value": "#0a0a1a",
                "gradient": "linear-gradient(135deg, #0a0a1a 0%, #1a0030 50%, #0a001a 100%)",
                "overlay_opacity": 0.4,
                "overlay_color": "#000000",
                "button_style": "pill",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 40,
                "body_size": 15,
                "font_weight": 700,
                "letter_spacing": 1.0,
                "heading_case": "uppercase",
            },
            "card": {"style": "glass", "radius": 20, "elevation": 2, "size": "compact"},
        }
    },
    # ── Minimal ───────────────────────────────────────────────────────────────
    {
        "id": "glass-morphism",
        "name": "Glass",
        "category": "minimal",
        "description": "Modern glassmorphism design",
        "badge": "Popular",
        "tags": ["Best for ISPs"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#ffffff",
                "secondary_color": "rgba(255,255,255,0.05)",
                "accent_color": "#60a5fa",
                "background_type": "gradient",
                "background_value": "#0f172a",
                "gradient": "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                "overlay_opacity": 0.2,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 28,
                "body_size": 14,
                "font_weight": 400,
                "letter_spacing": 0.2,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 24, "elevation": 0, "size": "comfortable"},
        }
    },
    {
        "id": "apple-style",
        "name": "Apple Style",
        "category": "minimal",
        "description": "Clean Apple-inspired minimal design",
        "badge": None,
        "tags": ["Best for Premium"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#1d1d1f",
                "secondary_color": "#f5f5f7",
                "accent_color": "#0071e3",
                "background_type": "solid",
                "background_value": "#f5f5f7",
                "overlay_opacity": 0,
                "overlay_color": "#000000",
                "button_style": "pill",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 48,
                "body_size": 17,
                "font_weight": 600,
                "letter_spacing": -0.5,
                "heading_case": "normal",
            },
            "card": {"style": "minimal", "radius": 16, "elevation": 0, "size": "large"},
        }
    },
    {
        "id": "material-design",
        "name": "Material",
        "category": "minimal",
        "description": "Google Material Design 3 inspired",
        "badge": None,
        "tags": ["Best for Cafes"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#6750A4",
                "secondary_color": "#1c1b1f",
                "accent_color": "#D0BCFF",
                "background_type": "solid",
                "background_value": "#1c1b1f",
                "overlay_opacity": 0.2,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 30,
                "body_size": 14,
                "font_weight": 500,
                "letter_spacing": 0.1,
                "heading_case": "normal",
            },
            "card": {"style": "outline", "radius": 28, "elevation": 0, "size": "compact"},
        }
    },
    {
        "id": "clean-white",
        "name": "Clean White",
        "category": "minimal",
        "description": "Bright and clean white theme",
        "badge": None,
        "tags": ["Best for Offices"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#333333",
                "secondary_color": "#ffffff",
                "accent_color": "#4A90D9",
                "background_type": "solid",
                "background_value": "#ffffff",
                "overlay_opacity": 0,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 32,
                "body_size": 16,
                "font_weight": 400,
                "letter_spacing": 0.3,
                "heading_case": "normal",
            },
            "card": {"style": "outline", "radius": 8, "elevation": 0, "size": "comfortable"},
        }
    },
    # ── Local ────────────────────────────────────────────────────────────────
    {
        "id": "kenyan-gold",
        "name": "Kenyan Gold",
        "category": "local",
        "description": "Celebrate Kenya with gold and black",
        "badge": "Popular",
        "tags": ["Best for ISPs"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#DAA520",
                "secondary_color": "#0a0a0a",
                "accent_color": "#FFD700",
                "background_type": "gradient",
                "background_value": "#0a0a0a",
                "gradient": "linear-gradient(135deg, #0a0a0a 0%, #1a1400 100%)",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 34,
                "body_size": 16,
                "font_weight": 600,
                "letter_spacing": 0.3,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 12, "elevation": 1, "size": "compact"},
        }
    },
    {
        "id": "safari",
        "name": "Safari",
        "category": "local",
        "description": "Earthy tones inspired by the savannah",
        "badge": None,
        "tags": ["Best for Hotels"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#C4873B",
                "secondary_color": "#2a1f14",
                "accent_color": "#E8B84B",
                "background_type": "gradient",
                "background_value": "#2a1f14",
                "gradient": "linear-gradient(180deg, #2a1f14 0%, #1a120a 100%)",
                "overlay_opacity": 0.4,
                "overlay_color": "#000000",
                "button_style": "pill",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 36,
                "body_size": 15,
                "font_weight": 500,
                "letter_spacing": 0.5,
                "heading_case": "normal",
            },
            "card": {"style": "minimal", "radius": 8, "elevation": 0, "size": "comfortable"},
        }
    },
    {
        "id": "afro-modern",
        "name": "Afro Modern",
        "category": "local",
        "description": "Bold African patterns meets modern design",
        "badge": "New",
        "tags": ["Best for ISPs"],
        "base_template": "stories.html",
        "preset": {
            "theme": {
                "primary_color": "#E85D26",
                "secondary_color": "#1a0f0a",
                "accent_color": "#F5A623",
                "background_type": "solid",
                "background_value": "#1a0f0a",
                "overlay_opacity": 0.4,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 32,
                "body_size": 15,
                "font_weight": 700,
                "letter_spacing": 0.5,
                "heading_case": "uppercase",
            },
            "card": {"style": "glass", "radius": 16, "elevation": 2, "size": "compact"},
        }
    },
    {
        "id": "nairobi-night",
        "name": "Nairobi Night",
        "category": "local",
        "description": "City lights inspired dark theme",
        "badge": None,
        "tags": ["Best for Cafes"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#6C3EB8",
                "secondary_color": "#0a0a14",
                "accent_color": "#B388FF",
                "background_type": "solid",
                "background_value": "#0a0a14",
                "overlay_opacity": 0.4,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 30,
                "body_size": 14,
                "font_weight": 500,
                "letter_spacing": 0.3,
                "heading_case": "normal",
            },
            "card": {"style": "floating", "radius": 16, "elevation": 2, "size": "compact"},
        }
    },
    # ── Additional ────────────────────────────────────────────────────────────
    {
        "id": "sunset-vibes",
        "name": "Sunset Vibes",
        "category": "entertainment",
        "description": "Warm sunset gradient theme for casual venues",
        "badge": None,
        "tags": ["Best for Cafes"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#FF6B6B",
                "secondary_color": "#1a0a0a",
                "accent_color": "#FFE66D",
                "background_type": "gradient",
                "background_value": "#1a0a0a",
                "gradient": "linear-gradient(135deg, #1a0a0a 0%, #2d1b1b 50%, #1a1410 100%)",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "pill",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 34,
                "body_size": 15,
                "font_weight": 500,
                "letter_spacing": 0.4,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 18, "elevation": 0, "size": "comfortable"},
        }
    },
    {
        "id": "ocean-deep",
        "name": "Ocean Deep",
        "category": "business",
        "description": "Deep blue ocean inspired calm theme",
        "badge": None,
        "tags": ["Best for Hotels"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#0077B6",
                "secondary_color": "#03045E",
                "accent_color": "#00B4D8",
                "background_type": "gradient",
                "background_value": "#03045E",
                "gradient": "linear-gradient(180deg, #03045E 0%, #023E8A 100%)",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 32,
                "body_size": 15,
                "font_weight": 500,
                "letter_spacing": 0.5,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 12, "elevation": 0, "size": "comfortable"},
        }
    },
    {
        "id": "midnight-purple",
        "name": "Midnight Purple",
        "category": "entertainment",
        "description": "Deep purple theme for premium lounges",
        "badge": None,
        "tags": ["Best for Events"],
        "base_template": "stories.html",
        "preset": {
            "theme": {
                "primary_color": "#9b59b6",
                "secondary_color": "#0d0015",
                "accent_color": "#f1c40f",
                "background_type": "solid",
                "background_value": "#0d0015",
                "overlay_opacity": 0.4,
                "overlay_color": "#000000",
                "button_style": "pill",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 36,
                "body_size": 15,
                "font_weight": 600,
                "letter_spacing": 0.8,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 16, "elevation": 2, "size": "compact"},
        }
    },
    {
        "id": "coffee-shop",
        "name": "Coffee Shop",
        "category": "local",
        "description": "Warm brown theme perfect for cafes",
        "badge": "New",
        "tags": ["Best for Cafes"],
        "base_template": "portal_spotlight.html",
        "preset": {
            "theme": {
                "primary_color": "#D4A574",
                "secondary_color": "#1C1512",
                "accent_color": "#8B5E3C",
                "background_type": "solid",
                "background_value": "#1C1512",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "rounded",
            },
            "typography": {
                "font_family": "Space Grotesk",
                "heading_size": 30,
                "body_size": 14,
                "font_weight": 500,
                "letter_spacing": 0.3,
                "heading_case": "normal",
            },
            "card": {"style": "minimal", "radius": 8, "elevation": 0, "size": "comfortable"},
        }
    },
    {
        "id": "cherry-blossom",
        "name": "Cherry Blossom",
        "category": "minimal",
        "description": "Soft pink theme with elegance",
        "badge": "New",
        "tags": ["Best for Premium"],
        "base_template": "portal_dashboard.html",
        "preset": {
            "theme": {
                "primary_color": "#FFB7C5",
                "secondary_color": "#1a1014",
                "accent_color": "#d4a0a0",
                "background_type": "gradient",
                "background_value": "#1a1014",
                "gradient": "linear-gradient(135deg, #1a1014 0%, #2d1a20 100%)",
                "overlay_opacity": 0.3,
                "overlay_color": "#000000",
                "button_style": "pill",
            },
            "typography": {
                "font_family": "Inter",
                "heading_size": 30,
                "body_size": 14,
                "font_weight": 400,
                "letter_spacing": 0.5,
                "heading_case": "normal",
            },
            "card": {"style": "glass", "radius": 20, "elevation": 0, "size": "comfortable"},
        }
    },
]


def get_templates_by_category(category: str | None = None) -> list[dict]:
    if category:
        return [t for t in TEMPLATE_GALLERY if t["category"] == category]
    return TEMPLATE_GALLERY


def get_template(template_id: str) -> dict | None:
    for t in TEMPLATE_GALLERY:
        if t["id"] == template_id:
            return t
    return None


def get_categories() -> list[dict]:
    seen = set()
    cats = []
    for t in TEMPLATE_GALLERY:
        if t["category"] not in seen:
            seen.add(t["category"])
            count = sum(1 for x in TEMPLATE_GALLERY if x["category"] == t["category"])
            cats.append({"id": t["category"], "name": t["category"].title(), "count": count})
    return cats


CATEGORY_EMOJIS = {
    "business": "💼",
    "entertainment": "🎮",
    "minimal": "◻️",
    "local": "🌍",
}
