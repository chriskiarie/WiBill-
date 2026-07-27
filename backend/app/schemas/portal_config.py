from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from enum import Enum


class TemplateID(str, Enum):
    spotlight = "spotlight"
    dashboard = "dashboard"
    split = "split"
    bento = "bento"


class PaletteIndex(int, Enum):
    midnight = 0
    arctic = 1
    forest = 2
    sunset = 3


class LayoutSize(str, Enum):
    compact = "compact"
    standard = "standard"
    expanded = "expanded"


class Package(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    duration_label: str = Field(..., min_length=1, max_length=20)
    speed_label: Optional[str] = Field(None, max_length=30)
    price_ksh: int = Field(..., gt=0)
    is_featured: bool = False


class EnabledFeatures(BaseModel):
    mpesa_stk: bool = True
    card_payments: bool = False
    vouchers: bool = False
    sms_receipts: bool = False


class NetworkAwareness(BaseModel):
    show_status_banner: bool = True
    custom_status_message: Optional[str] = Field(None, max_length=100)


class Design(BaseModel):
    palette_index: PaletteIndex = Field(default=PaletteIndex.midnight)
    font_family: str = Field(default="Syne", max_length=50)
    card_radius: str = Field(default="16px", max_length=20)
    layout_size: LayoutSize = Field(default=LayoutSize.compact)


class Brand(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    tagline: Optional[str] = Field(None, max_length=150)
    location: Optional[str] = Field(None, max_length=100)
    emoji: str = Field(default="🌐", max_length=10)
    support_phone: Optional[str] = Field(None, max_length=20)


class PortalConfig(BaseModel):
    version: str = Field(default="1.0", pattern=r"^\d+\.\d+$")
    template_id: TemplateID = Field(default=TemplateID.spotlight)
    design: Design = Field(default_factory=Design)
    brand: Brand = Field(default_factory=Brand)
    network_awareness: NetworkAwareness = Field(default_factory=NetworkAwareness)
    packages: List[Package] = Field(default_factory=list)
    enabled_features: EnabledFeatures = Field(default_factory=EnabledFeatures)

    @validator('packages')
    def validate_packages(cls, v):
        if not v:
            raise ValueError('packages cannot be empty')
        return v

    @validator('enabled_features')
    def validate_features(cls, v):
        # At least one payment method must be enabled
        if not any([v.mpesa_stk, v.card_payments, v.vouchers]):
            raise ValueError('At least one payment method must be enabled')
        return v


class PortalConfigUpdateRequest(BaseModel):
    """Request payload for updating portal configuration"""
    portal_config: PortalConfig

    @validator('portal_config')
    def validate_portal_config(cls, v):
        # Ensure the config has at least one package
        if not v.packages:
            raise ValueError('At least one package must be configured')
        return v