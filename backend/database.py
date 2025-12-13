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

# Создаем движок SQLAlchemy
if SQLALCHEMY_DATABASE_URL.startswith('postgresql'):
    # PostgreSQL (для Railway)
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # SQLite (для локальной разработки)
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

