from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем DATABASE_URL из переменных окружения
# Для Railway используем DATABASE_URL из переменных окружения
# Для локальной разработки используем SQLite
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', '')

if not SQLALCHEMY_DATABASE_URL:
    # Локальная разработка - используем SQLite
    SQLALCHEMY_DATABASE_URL = "sqlite:///./db.sqlite3"
    print("⚠️ [DATABASE] DATABASE_URL not set, using SQLite:", SQLALCHEMY_DATABASE_URL)
else:
    # Скрываем пароль в логах
    db_url_display = SQLALCHEMY_DATABASE_URL
    if '@' in db_url_display:
        # Скрываем пароль: postgresql://user:password@host -> postgresql://user:***@host
        parts = db_url_display.split('@')
        if len(parts) == 2:
            user_pass = parts[0].split('://')
            if len(user_pass) == 2:
                protocol = user_pass[0]
                user_part = user_pass[1]
                if ':' in user_part:
                    user = user_part.split(':')[0]
                    db_url_display = f"{protocol}://{user}:***@{parts[1]}"
    print(f"✅ [DATABASE] Using DATABASE_URL: {db_url_display}")

# Создаем движок SQLAlchemy
if SQLALCHEMY_DATABASE_URL.startswith('postgresql'):
    # PostgreSQL (для Railway)
    print("✅ [DATABASE] Using PostgreSQL")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # SQLite (для локальной разработки)
    print("⚠️ [DATABASE] Using SQLite (local development)")
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}  # Нужно для SQLite
    )

# Создаем фабрику сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

# Функция для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Функция для инициализации БД (создание таблиц)
def init_db():
    Base.metadata.create_all(bind=engine)

