from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from dotenv import load_dotenv

from database import get_db, init_db
from models import User, UserGift, Transaction
from schemas import (
    UserResponse, UserCreate, 
    UserGiftResponse, UserGiftCreate,
    TransactionResponse, TransactionCreate,
    PurchaseRequest, DepositRequest, BalanceResponse
)

# Загружаем переменные окружения
load_dotenv()

# Создаем приложение FastAPI
app = FastAPI(
    title="Capsule Market API",
    description="API для маркетплейса подарков Telegram",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация БД при старте
@app.on_event("startup")
async def startup_event():
    init_db()
    print("Database initialized")

# ==================== USER ENDPOINTS ====================

@app.get("/api/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """Получить информацию о пользователе"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/api/user", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Создать или обновить пользователя"""
    # Проверяем, существует ли пользователь
    existing_user = db.query(User).filter(User.user_id == user_data.user_id).first()
    if existing_user:
        # Обновляем данные пользователя если они изменились
        if user_data.username:
            existing_user.username = user_data.username
        if user_data.first_name:
            existing_user.first_name = user_data.first_name
        if user_data.last_name:
            existing_user.last_name = user_data.last_name
        if user_data.is_premium is not None:
            existing_user.is_premium = user_data.is_premium
        db.commit()
        db.refresh(existing_user)
        return existing_user
    
    # Создаем нового пользователя
    db_user = User(**user_data.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/user/{user_id}/balance", response_model=BalanceResponse)
async def get_balance(user_id: int, db: Session = Depends(get_db)):
    """Получить баланс пользователя"""
    print(f"[API] Getting balance for user_id: {user_id} (type: {type(user_id)})")
    
    # Проверяем, сколько всего пользователей в БД
    total_users = db.query(User).count()
    print(f"[API] Total users in database: {total_users}")
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        print(f"[API] User {user_id} not found, creating new user")
        # Создаем пользователя с нулевым балансом
        user = User(user_id=user_id, balance_ton=0.0, balance_stars=0)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        print(f"[API] User {user_id} found:")
        print(f"  - balance_ton: {user.balance_ton}")
        print(f"  - balance_stars: {user.balance_stars}")
        print(f"  - username: {user.username}")
        print(f"  - created_at: {user.created_at}")
    
    response = BalanceResponse(balance_ton=user.balance_ton, balance_stars=user.balance_stars)
    print(f"[API] Returning balance: {response.balance_ton} TON, {response.balance_stars} STARS")
    return response

@app.post("/api/user/{user_id}/deposit", response_model=TransactionResponse)
async def deposit_balance(
    user_id: int, 
    deposit_data: DepositRequest,
    db: Session = Depends(get_db)
):
    """Пополнить баланс пользователя"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        # Создаем пользователя если его нет
        user = User(user_id=user_id, balance_ton=0.0, balance_stars=0)
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Обновляем баланс
    if deposit_data.currency == 'TON':
        user.balance_ton += deposit_data.amount
    elif deposit_data.currency == 'STARS':
        user.balance_stars += int(deposit_data.amount)
    else:
        raise HTTPException(status_code=400, detail="Invalid currency")
    
    # Создаем транзакцию
    transaction = Transaction(
        user_id=user_id,
        transaction_type='deposit',
        amount=deposit_data.amount,
        currency=deposit_data.currency,
        tx_hash=deposit_data.tx_hash,
        status='completed'
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction

# ==================== GIFTS ENDPOINTS ====================

@app.get("/api/user/{user_id}/gifts", response_model=List[UserGiftResponse])
async def get_user_gifts(user_id: int, db: Session = Depends(get_db)):
    """Получить список подарков пользователя"""
    # Проверяем существование пользователя
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return []
    
    gifts = db.query(UserGift).filter(UserGift.user_id == user_id).all()
    return gifts

@app.post("/api/user/{user_id}/purchase", response_model=UserGiftResponse)
async def purchase_gift(
    user_id: int,
    purchase_data: PurchaseRequest,
    db: Session = Depends(get_db)
):
    """Купить подарок"""
    # Получаем пользователя
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Проверяем баланс
    if user.balance_ton < purchase_data.gift_price:
        raise HTTPException(
            status_code=400, 
            detail="Insufficient balance"
        )
    
    # Проверяем, нет ли уже такого подарка
    existing_gift = db.query(UserGift).filter(
        UserGift.user_id == user_id,
        UserGift.gift_id == purchase_data.gift_id
    ).first()
    
    if existing_gift:
        raise HTTPException(
            status_code=400,
            detail="Gift already purchased"
        )
    
    # Списываем баланс
    user.balance_ton -= purchase_data.gift_price
    
    # Создаем запись о подарке
    user_gift = UserGift(
        user_id=user_id,
        gift_id=purchase_data.gift_id,
        gift_name=purchase_data.gift_name,
        gift_preview=purchase_data.gift_preview,
        gift_price=purchase_data.gift_price
    )
    db.add(user_gift)
    
    # Создаем транзакцию
    transaction = Transaction(
        user_id=user_id,
        transaction_type='purchase',
        amount=purchase_data.gift_price,
        currency='TON',
        gift_id=purchase_data.gift_id,
        status='completed'
    )
    db.add(transaction)
    
    db.commit()
    db.refresh(user_gift)
    
    return user_gift

# ==================== TRANSACTIONS ENDPOINTS ====================

@app.get("/api/user/{user_id}/transactions", response_model=List[TransactionResponse])
async def get_user_transactions(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Получить историю транзакций пользователя"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return []
    
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).limit(limit).all()
    
    return transactions

# ==================== HEALTH CHECK ====================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Capsule Market API is running"}

@app.get("/api")
async def api_root():
    """API root endpoint"""
    return {
        "status": "ok",
        "message": "Capsule Market API",
        "endpoints": {
            "user": "/api/user/{user_id}",
            "balance": "/api/user/{user_id}/balance",
            "gifts": "/api/user/{user_id}/gifts",
            "purchase": "/api/user/{user_id}/purchase",
            "transactions": "/api/user/{user_id}/transactions"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

