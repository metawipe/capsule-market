"""
Скрипт для запуска обоих ботов одновременно
"""
import os
import sys
from threading import Thread
import time

# Добавляем путь к bot для импорта
sys.path.insert(0, os.path.dirname(__file__))

def run_admin_bot():
    """Запуск админ-бота с перезапуском при ошибках"""
    while True:
        try:
            print("🤖 Запуск админ-бота...")
            from admin_bot import main as admin_main
            admin_main()
        except KeyboardInterrupt:
            print("⏹️ Админ-бот остановлен пользователем")
            break
        except Exception as e:
            print(f"❌ Ошибка в админ-боте: {e}")
            import traceback
            traceback.print_exc()
            print("🔄 Перезапуск админ-бота через 5 секунд...")
            time.sleep(5)

def run_payment_bot():
    """Запуск бота оплаты с перезапуском при ошибках"""
    while True:
        try:
            print("💳 Запуск бота оплаты...")
            from payment_bot import main as payment_main
            payment_main()
        except KeyboardInterrupt:
            print("⏹️ Бот оплаты остановлен пользователем")
            break
        except Exception as e:
            print(f"❌ Ошибка в боте оплаты: {e}")
            import traceback
            traceback.print_exc()
            print("🔄 Перезапуск бота оплаты через 5 секунд...")
            time.sleep(5)

def main():
    """Запуск обоих ботов в отдельных потоках"""
    print("🚀 Запуск ботов...")
    
    # Запускаем админ-бота в отдельном потоке
    admin_thread = Thread(target=run_admin_bot, daemon=True, name="AdminBot")
    admin_thread.start()
    time.sleep(2)  # Задержка между запусками
    
    # Запускаем бота оплаты в отдельном потоке
    payment_thread = Thread(target=run_payment_bot, daemon=True, name="PaymentBot")
    payment_thread.start()
    
    print("✅ Оба бота запущены!")
    
    # Ждем завершения
    try:
        while True:
            time.sleep(5)
            # Проверяем, что потоки еще живы
            if not admin_thread.is_alive():
                print("⚠️ Админ-бот остановился! Поток завершился.")
            if not payment_thread.is_alive():
                print("⚠️ Бот оплаты остановился! Поток завершился.")
    except KeyboardInterrupt:
        print("\n⏹️ Остановка ботов...")
        sys.exit(0)

if __name__ == '__main__':
    main()

