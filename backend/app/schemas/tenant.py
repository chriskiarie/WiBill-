from pydantic import BaseModel, Field
from typing import Optional

class PortalConfigUpdate(BaseModel):
    template: str = Field(..., description="e.g., 'spotlight-dark', 'dashboard-light', 'stories-feed'")
    palette: str = Field(..., description="e.g., 'midnight', 'arctic'")
    font: str = Field(..., description="Google font family identifier")
    tagline: Optional[str] = Field(None, max_length=150)
    card_shape: str = Field(..., description="e.g., 'rounded', 'pill', 'sharp', 'circular'")
    layout: Optional[str] = 'grid'
    emoji: Optional[str] = '🌎'
    announcement: Optional[str] = None
    show_vouchers: bool = False
    show_loyalty: bool = False
    loyalty_name: Optional[str] = 'XwB Points'
    loyalty_rate: Optional[float] = 0.0