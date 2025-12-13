from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    user_id: int
    wallet_address: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_premium: bool = False

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    balance_ton: float
    balance_stars: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Gift schemas
class GiftPreview(BaseModel):
    id: str
    name: str
    price: float
    preview: Optional[str] = None
    collection: Optional[str] = None
    backdrop: Optional[str] = None
    symbol: Optional[str] = None

class UserGiftBase(BaseModel):
    gift_id: str
    gift_name: str
    gift_preview: Optional[str] = None
    gift_price: float

class UserGiftCreate(UserGiftBase):
    pass

class UserGiftResponse(UserGiftBase):
    id: int
    user_id: int
    purchase_date: datetime
    
    class Config:
        from_attributes = True

# Transaction schemas
class TransactionBase(BaseModel):
    transaction_type: str
    amount: float
    currency: str = 'TON'
    gift_id: Optional[str] = None
    tx_hash: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Purchase request
class PurchaseRequest(BaseModel):
    gift_id: str
    gift_name: str
    gift_preview: Optional[str] = None
    gift_price: float

# Deposit request
class DepositRequest(BaseModel):
    amount: float
    currency: str = 'TON'
    tx_hash: Optional[str] = None

# Balance response
class BalanceResponse(BaseModel):
    balance_ton: float
    balance_stars: int

