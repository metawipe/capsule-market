"""
Скрипт для инициализации базы данных
Запустите этот скрипт один раз для создания таблиц
"""
from database import init_db, engine
from models import Base

if __name__ == "__main__":
    print("Инициализация базы данных...")
    init_db()
    print("База данных успешно инициализирована!")
    print(f"Файл БД: db.sqlite3")

