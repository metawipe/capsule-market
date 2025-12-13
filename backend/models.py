from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True, nullable=False)  # Telegram user ID
    wallet_address = Column(String(255), nullable=True)  # TON wallet address
    balance_ton = Column(Float, default=0.0, nullable=False)
    balance_stars = Column(Integer, default=0, nullable=False)
    username = Column(String(255), nullable=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связи
    gifts = relationship("UserGift", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")


class UserGift(Base):
    __tablename__ = "user_gifts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    gift_id = Column(String(255), nullable=False)  # ID подарка из gifts.json
    gift_name = Column(String(255), nullable=False)
    gift_preview = Column(Text, nullable=True)  # URL превью
    gift_price = Column(Float, nullable=False)  # Цена покупки
    purchase_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    user = relationship("User", back_populates="gifts")


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    transaction_type = Column(String(50), nullable=False)  # 'deposit', 'purchase', 'withdraw'
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default='TON')  # 'TON' or 'STARS'
    gift_id = Column(String(255), nullable=True)  # Если это покупка подарка
    status = Column(String(50), default='completed')  # 'pending', 'completed', 'failed'
    tx_hash = Column(String(255), nullable=True)  # Хеш транзакции TON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связи
    user = relationship("User", back_populates="transactions")

