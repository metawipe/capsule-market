"""
Скрипт для миграции user_id с Integer на BigInteger
Запустите этот скрипт один раз для обновления существующей базы данных
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', '')

if not DATABASE_URL:
    default_db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'db.sqlite3')
    DATABASE_URL = f'sqlite:///{os.path.abspath(default_db_path)}'

if DATABASE_URL.startswith('postgresql'):
    engine = create_engine(DATABASE_URL)
    
    print("Миграция user_id на BigInteger...")
    
    with engine.connect() as conn:
        # Изменяем тип user_id в таблице users
        conn.execute(text("ALTER TABLE users ALTER COLUMN user_id TYPE BIGINT"))
        print("✅ Таблица users обновлена")
        
        # Изменяем тип user_id в таблице user_gifts
        conn.execute(text("ALTER TABLE user_gifts ALTER COLUMN user_id TYPE BIGINT"))
        print("✅ Таблица user_gifts обновлена")
        
        # Изменяем тип user_id в таблице transactions
        conn.execute(text("ALTER TABLE transactions ALTER COLUMN user_id TYPE BIGINT"))
        print("✅ Таблица transactions обновлена")
        
        conn.commit()
    
    print("✅ Миграция завершена!")
else:
    print("⚠️ SQLite не требует миграции (поддерживает большие числа)")

