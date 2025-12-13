import json
import re
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup
import os


class FragmentCollectionsParser:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
        except Exception as e:
            print(f"✗ ОШИБКА при запуске Chrome WebDriver: {e}")
            print("Убедитесь, что у вас установлен Chrome и ChromeDriver")
            raise
        
        self.base_url = "https://fragment.com"
        
    def normalize_collection_name(self, collection_name):
        """Нормализует название коллекции для slug"""
        normalized = collection_name.lower().replace(' ', '').replace("'", "").replace("-", "")
        return normalized
    
    def clean_collection_name(self, name):
        """Удаляет числа и запятые в конце названия коллекции"""
        # Удаляем числа с запятыми в конце (например "6,279", "784,692")
        # Паттерн: пробел или без пробела, затем число с запятыми или без
        cleaned = re.sub(r'\s*\d+[,\d]*\s*$', '', name)
        # Убираем лишние пробелы в конце
        cleaned = cleaned.strip()
        return cleaned

    def parse_collections(self):
        """Парсит список всех коллекций из фильтров на странице gifts"""
        url = "https://fragment.com/gifts"
        collections = []
        
        try:
            print(f"Открываю страницу: {url}")
            self.driver.get(url)
            time.sleep(5)  # Ждем загрузки страницы и фильтров
            
            # Ждем появления списка фильтров
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "tm-main-filters-list"))
                )
                print("✓ Список фильтров загружен")
            except TimeoutException:
                print("⚠ Список фильтров не загрузился по таймауту, пробую найти коллекции...")
            
            # Прокручиваем страницу немного, чтобы убедиться что фильтры загружены
            self.driver.execute_script("window.scrollTo(0, 300);")
            time.sleep(2)
            
            # Парсим HTML
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Ищем список фильтров
            filters_list = soup.find('div', class_='tm-main-filters-list')
            
            if filters_list:
                print("✓ Найден список фильтров")
                
                # Ищем все элементы с классом tm-main-filters-item
                collection_items = filters_list.find_all('a', class_='tm-main-filters-item')
                
                print(f"Найдено {len(collection_items)} элементов коллекций")
                
                # Извлекаем данные для каждой коллекции
                for item in collection_items:
                    # Извлекаем href и получаем slug
                    href = item.get('href', '')
                    slug = None
                    if href:
                        # Извлекаем slug из href, например: /gifts/astralshard -> astralshard
                        match = re.search(r'/gifts/([^/?]+)', href)
                        if match:
                            slug = match.group(1)
                    
                    # Пробуем получить slug из data-value
                    if not slug:
                        slug = item.get('data-value', '')
                    
                    # Извлекаем название коллекции
                    # Сначала пробуем из data-keywords
                    collection_name = item.get('data-keywords', '')
                    
                    # Если нет в data-keywords, ищем в tm-main-filters-name
                    if not collection_name:
                        name_div = item.find('div', class_='tm-main-filters-name')
                        if name_div:
                            collection_name = name_div.get_text(strip=True)
                    
                    # Если все еще нет, берем текст из ссылки (но очищаем от чисел)
                    if not collection_name:
                        collection_name_raw = item.get_text(strip=True)
                        collection_name = self.clean_collection_name(collection_name_raw)
                    
                    # Пропускаем служебные элементы
                    if (not collection_name or 
                        collection_name.lower() in ['all collections', 'collection', 'select collection', 'ok', 'collections'] or
                        len(collection_name) < 2):
                        continue
                    
                    # Если slug все еще нет, создаем из названия
                    if not slug:
                        slug = self.normalize_collection_name(collection_name)
                    
                    # Извлекаем иконку (webp)
                    icon_url = None
                    img = item.find('img')
                    if img:
                        icon_src = img.get('src', '')
                        if icon_src:
                            # Если путь относительный, делаем его абсолютным
                            if icon_src.startswith('/'):
                                icon_url = f"https://fragment.com{icon_src}"
                            elif icon_src.startswith('http'):
                                icon_url = icon_src
                            else:
                                icon_url = f"https://fragment.com/{icon_src}"
                    
                    # Если иконка не найдена в img, пробуем найти в tm-main-filters-photo
                    if not icon_url:
                        photo_div = item.find('div', class_='tm-main-filters-photo')
                        if photo_div:
                            img_in_photo = photo_div.find('img')
                            if img_in_photo:
                                icon_src = img_in_photo.get('src', '')
                                if icon_src:
                                    if icon_src.startswith('/'):
                                        icon_url = f"https://fragment.com{icon_src}"
                                    elif icon_src.startswith('http'):
                                        icon_url = icon_src
                                    else:
                                        icon_url = f"https://fragment.com/{icon_src}"
                    
                    collection_data = {
                        'name': collection_name,
                        'slug': slug,
                        'icon': icon_url,
                        'href': href if href.startswith('http') else f"https://fragment.com{href}" if href.startswith('/') else href
                    }
                    
                    # Проверяем на дубликаты по slug или названию
                    if not any(c.get('slug') == slug or c.get('name') == collection_name for c in collections):
                        collections.append(collection_data)
                        print(f"  ✓ {collection_name} ({slug})")
                    else:
                        print(f"  ⚠ Пропущена дубликат: {collection_name}")
            else:
                print("✗ Список фильтров не найден")
                # Fallback: пробуем найти через старый метод
                filters_box = soup.find('div', class_='tm-main-filters-box')
                if filters_box:
                    print("Пробую альтернативный метод...")
                    all_items = filters_box.find_all('a', class_=re.compile(r'tm-main-filters-item'))
                    for item in all_items:
                        href = item.get('href', '')
                        if '/gifts/' in href:
                            match = re.search(r'/gifts/([^/?]+)', href)
                            slug = match.group(1) if match else None
                            name = item.get('data-keywords') or item.get_text(strip=True)
                            name = self.clean_collection_name(name)
                            
                            img = item.find('img')
                            icon_url = None
                            if img:
                                icon_src = img.get('src', '')
                                if icon_src:
                                    icon_url = f"https://fragment.com{icon_src}" if icon_src.startswith('/') else icon_src
                            
                            if name and name.lower() not in ['all collections', 'collection']:
                                if not any(c.get('slug') == slug or c.get('name') == name for c in collections):
                                    collections.append({
                                        'name': name,
                                        'slug': slug or self.normalize_collection_name(name),
                                        'icon': icon_url,
                                        'href': f"https://fragment.com{href}" if href.startswith('/') else href
                                    })
                                    print(f"  ✓ {name}")
            
            # Сортируем по названию
            collections.sort(key=lambda x: x['name'].lower())
            
            print(f"\n✓ Найдено {len(collections)} коллекций")
            return collections
            
        except Exception as e:
            print(f"✗ Ошибка при парсинге коллекций: {e}")
            import traceback
            traceback.print_exc()
            return collections
    
    def parse_backdrops(self):
        """Парсит список всех бэкдропов из фильтров на странице gifts"""
        url = "https://fragment.com/gifts/astralshard"
        backdrops = []
        
        try:
            print(f"Открываю страницу: {url}")
            self.driver.get(url)
            time.sleep(5)  # Ждем загрузки страницы и фильтров
            
            # Ждем появления фильтров
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "tm-main-filters-box"))
                )
                print("✓ Фильтры загружены")
            except TimeoutException:
                print("⚠ Фильтры не загрузились по таймауту, пробую найти бэкдропы...")
            
            # Прокручиваем страницу немного
            self.driver.execute_script("window.scrollTo(0, 300);")
            time.sleep(2)
            
            # Пробуем найти и кликнуть на секцию Backdrop, чтобы раскрыть её
            try:
                # Ищем заголовок секции Backdrop
                backdrop_section = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'tm-main-filters-item') and contains(., 'Backdrop')]"))
                )
                # Прокручиваем к секции
                self.driver.execute_script("arguments[0].scrollIntoView(true);", backdrop_section)
                time.sleep(1)
                # Кликаем, чтобы раскрыть
                backdrop_section.click()
                time.sleep(2)
                print("✓ Секция Backdrop раскрыта")
            except (TimeoutException, NoSuchElementException):
                print("⚠ Не удалось найти или раскрыть секцию Backdrop, пробую найти элементы...")
            
            # Парсим HTML
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Ищем секцию Backdrop по правильному классу
            # tm-main-filters-box tm-main-filter-attr-backdrop
            backdrop_box = soup.find('div', class_=lambda x: x and 'tm-main-filter-attr-backdrop' in x)
            
            backdrop_items = []
            
            if backdrop_box:
                print("✓ Найдена секция Backdrop (tm-main-filter-attr-backdrop)")
                
                # Ищем tm-main-filters-content внутри секции
                content = backdrop_box.find('div', class_='tm-main-filters-content')
                if content:
                    # Ищем tm-main-filters-list
                    filters_list = content.find('div', class_='tm-main-filters-list')
                    if filters_list:
                        print("✓ Найден tm-main-filters-list внутри секции Backdrop")
                        # Ищем все div элементы с классом js-attribute-item (НЕ <a>!)
                        backdrop_items = filters_list.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                        print(f"Найдено {len(backdrop_items)} элементов бэкдропов")
                    else:
                        # Если список не найден, ищем напрямую в content
                        backdrop_items = content.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                        print(f"Найдено {len(backdrop_items)} элементов бэкдропов (напрямую в content)")
                else:
                    # Если content не найден, ищем напрямую в backdrop_box
                    backdrop_items = backdrop_box.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                    print(f"Найдено {len(backdrop_items)} элементов бэкдропов (напрямую в box)")
            else:
                print("⚠ Секция Backdrop не найдена, пробую альтернативный поиск...")
                # Fallback: ищем все div с классом js-attribute-item
                all_items = soup.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                print(f"Найдено {len(all_items)} элементов с js-attribute-item")
                backdrop_items = all_items
            
            print(f"Итого найдено {len(backdrop_items)} потенциальных элементов бэкдропов")
            
            # Извлекаем данные для каждого бэкдропа
            for item in backdrop_items:
                # Пропускаем элемент "All" если он есть
                if 'js-attribute-all' in item.get('class', []):
                    continue
                
                # Извлекаем название бэкдропа
                backdrop_name = None
                
                # Сначала пробуем data-keywords (как на скриншоте)
                backdrop_name = item.get('data-keywords', '')
                
                # Если нет, пробуем data-value
                if not backdrop_name:
                    backdrop_name = item.get('data-value', '')
                
                # Если нет, ищем в tm-main-filters-name
                if not backdrop_name:
                    name_div = item.find('div', class_='tm-main-filters-name')
                    if name_div:
                        backdrop_name = name_div.get_text(strip=True)
                
                # Если все еще нет, берем весь текст и очищаем
                if not backdrop_name:
                    backdrop_name_raw = item.get_text(strip=True)
                    backdrop_name = self.clean_collection_name(backdrop_name_raw)
                
                # Пропускаем пустые или служебные элементы
                if (not backdrop_name or 
                    backdrop_name.lower() in ['all', 'all backdrops', 'backdrop', 'backdrops', 'select all'] or
                    len(backdrop_name) < 2):
                    continue
                
                # Извлекаем иконку (svg или webp)
                icon_url = None
                img = item.find('img')
                if img:
                    icon_src = img.get('src', '')
                    if icon_src:
                        # Если путь относительный, делаем его абсолютным
                        if icon_src.startswith('/'):
                            icon_url = f"https://fragment.com{icon_src}"
                        elif icon_src.startswith('http'):
                            icon_url = icon_src
                        else:
                            icon_url = f"https://fragment.com/{icon_src}"
                
                # Если иконка не найдена в img, пробуем найти в tm-main-filters-photo
                if not icon_url:
                    photo_div = item.find('div', class_='tm-main-filters-photo')
                    if photo_div:
                        img_in_photo = photo_div.find('img')
                        if img_in_photo:
                            icon_src = img_in_photo.get('src', '')
                            if icon_src:
                                if icon_src.startswith('/'):
                                    icon_url = f"https://fragment.com{icon_src}"
                                elif icon_src.startswith('http'):
                                    icon_url = icon_src
                                else:
                                    icon_url = f"https://fragment.com/{icon_src}"
                
                # Извлекаем slug из data-value (как на скриншоте)
                backdrop_slug = item.get('data-value', '')
                
                # Если slug нет, создаем из названия
                if not backdrop_slug:
                    backdrop_slug = self.normalize_collection_name(backdrop_name)
                
                backdrop_data = {
                    'name': backdrop_name,
                    'slug': backdrop_slug,
                    'icon': icon_url
                }
                
                # Проверяем на дубликаты по названию или slug
                if not any(b.get('name') == backdrop_name or b.get('slug') == backdrop_slug for b in backdrops):
                    backdrops.append(backdrop_data)
                    print(f"  ✓ {backdrop_name} ({backdrop_slug})")
                else:
                    print(f"  ⚠ Пропущен дубликат: {backdrop_name}")
            
            # Сортируем по названию
            backdrops.sort(key=lambda x: x['name'].lower())
            
            print(f"\n✓ Найдено {len(backdrops)} бэкдропов")
            return backdrops
            
        except Exception as e:
            print(f"✗ Ошибка при парсинге бэкдропов: {e}")
            import traceback
            traceback.print_exc()
            return backdrops
    
    def save_collections(self, collections, path=None):
        """Сохраняет список коллекций в JSON файл"""
        if path is None:
            path = os.path.join(os.path.dirname(__file__), 'collections_list.json')
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(collections, f, ensure_ascii=False, indent=2)
            print(f"✓ Сохранено {len(collections)} коллекций в {path}")
        except IOError as e:
            print(f"✗ Ошибка при сохранении: {e}")
    
    def parse_symbols(self):
        """Парсит список всех символов из фильтров на странице gifts"""
        url = "https://fragment.com/gifts/astralshard"
        symbols = []
        
        try:
            print(f"Открываю страницу: {url}")
            self.driver.get(url)
            time.sleep(5)  # Ждем загрузки страницы и фильтров
            
            # Ждем появления фильтров
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "tm-main-filters-box"))
                )
                print("✓ Фильтры загружены")
            except TimeoutException:
                print("⚠ Фильтры не загрузились по таймауту, пробую найти символы...")
            
            # Прокручиваем страницу немного
            self.driver.execute_script("window.scrollTo(0, 300);")
            time.sleep(2)
            
            # Пробуем найти и кликнуть на секцию Symbol, чтобы раскрыть её
            try:
                # Ищем заголовок секции Symbol
                symbol_section = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'tm-main-filters-item') and contains(., 'Symbol')]"))
                )
                # Прокручиваем к секции
                self.driver.execute_script("arguments[0].scrollIntoView(true);", symbol_section)
                time.sleep(1)
                # Кликаем, чтобы раскрыть
                symbol_section.click()
                time.sleep(2)
                print("✓ Секция Symbol раскрыта")
            except (TimeoutException, NoSuchElementException):
                print("⚠ Не удалось найти или раскрыть секцию Symbol, пробую найти элементы...")
            
            # Парсим HTML
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Ищем секцию Symbol по правильному классу
            # tm-main-filters-box tm-main-filter-attr-symbol
            symbol_box = soup.find('div', class_=lambda x: x and 'tm-main-filter-attr-symbol' in x)
            
            symbol_items = []
            
            if symbol_box:
                print("✓ Найдена секция Symbol (tm-main-filter-attr-symbol)")
                
                # Ищем tm-main-filters-content внутри секции
                content = symbol_box.find('div', class_='tm-main-filters-content')
                if content:
                    # Ищем tm-main-filters-list
                    filters_list = content.find('div', class_='tm-main-filters-list')
                    if filters_list:
                        print("✓ Найден tm-main-filters-list внутри секции Symbol")
                        # Ищем все div элементы с классом js-attribute-item
                        symbol_items = filters_list.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                        print(f"Найдено {len(symbol_items)} элементов символов")
                    else:
                        # Если список не найден, ищем напрямую в content
                        symbol_items = content.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                        print(f"Найдено {len(symbol_items)} элементов символов (напрямую в content)")
                else:
                    # Если content не найден, ищем напрямую в symbol_box
                    symbol_items = symbol_box.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                    print(f"Найдено {len(symbol_items)} элементов символов (напрямую в box)")
            else:
                print("⚠ Секция Symbol не найдена, пробую альтернативный поиск...")
                # Fallback: ищем все div с классом js-attribute-item
                all_items = soup.find_all('div', class_=lambda x: x and 'js-attribute-item' in x)
                print(f"Найдено {len(all_items)} элементов с js-attribute-item")
                symbol_items = all_items
            
            print(f"Итого найдено {len(symbol_items)} потенциальных элементов символов")
            
            # Извлекаем данные для каждого символа
            for item in symbol_items:
                # Пропускаем элемент "All" если он есть
                if 'js-attribute-all' in item.get('class', []):
                    continue
                
                # Извлекаем название символа
                symbol_name = None
                
                # Сначала пробуем data-keywords (как на скриншоте)
                symbol_name = item.get('data-keywords', '')
                
                # Если нет, пробуем data-value
                if not symbol_name:
                    symbol_name = item.get('data-value', '')
                
                # Если нет, ищем в tm-main-filters-name
                if not symbol_name:
                    name_div = item.find('div', class_='tm-main-filters-name')
                    if name_div:
                        symbol_name = name_div.get_text(strip=True)
                
                # Если все еще нет, берем весь текст и очищаем
                if not symbol_name:
                    symbol_name_raw = item.get_text(strip=True)
                    symbol_name = self.clean_collection_name(symbol_name_raw)
                
                # Пропускаем пустые или служебные элементы
                if (not symbol_name or 
                    symbol_name.lower() in ['all', 'all symbols', 'symbol', 'symbols', 'select all'] or
                    len(symbol_name) < 2):
                    continue
                
                # Извлекаем иконку (webp или svg)
                icon_url = None
                img = item.find('img')
                if img:
                    icon_src = img.get('src', '')
                    if icon_src:
                        # Если путь относительный, делаем его абсолютным
                        if icon_src.startswith('/'):
                            icon_url = f"https://fragment.com{icon_src}"
                        elif icon_src.startswith('http'):
                            icon_url = icon_src
                        else:
                            icon_url = f"https://fragment.com/{icon_src}"
                
                # Если иконка не найдена в img, пробуем найти в tm-main-filters-photo
                if not icon_url:
                    photo_div = item.find('div', class_='tm-main-filters-photo')
                    if photo_div:
                        img_in_photo = photo_div.find('img')
                        if img_in_photo:
                            icon_src = img_in_photo.get('src', '')
                            if icon_src:
                                if icon_src.startswith('/'):
                                    icon_url = f"https://fragment.com{icon_src}"
                                elif icon_src.startswith('http'):
                                    icon_url = icon_src
                                else:
                                    icon_url = f"https://fragment.com/{icon_src}"
                
                # Извлекаем slug из data-value (как на скриншоте)
                symbol_slug = item.get('data-value', '')
                
                # Если slug нет, создаем из названия
                if not symbol_slug:
                    symbol_slug = self.normalize_collection_name(symbol_name)
                
                symbol_data = {
                    'name': symbol_name,
                    'slug': symbol_slug,
                    'icon': icon_url
                }
                
                # Проверяем на дубликаты по названию или slug
                if not any(s.get('name') == symbol_name or s.get('slug') == symbol_slug for s in symbols):
                    symbols.append(symbol_data)
                    print(f"  ✓ {symbol_name} ({symbol_slug})")
                else:
                    print(f"  ⚠ Пропущен дубликат: {symbol_name}")
            
            # Сортируем по названию
            symbols.sort(key=lambda x: x['name'].lower())
            
            print(f"\n✓ Найдено {len(symbols)} символов")
            return symbols
            
        except Exception as e:
            print(f"✗ Ошибка при парсинге символов: {e}")
            import traceback
            traceback.print_exc()
            return symbols
    
    def save_backdrops(self, backdrops, path=None):
        """Сохраняет список бэкдропов в JSON файл"""
        if path is None:
            path = os.path.join(os.path.dirname(__file__), 'backdrops_list.json')
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(backdrops, f, ensure_ascii=False, indent=2)
            print(f"✓ Сохранено {len(backdrops)} бэкдропов в {path}")
        except IOError as e:
            print(f"✗ Ошибка при сохранении: {e}")
    
    def save_symbols(self, symbols, path=None):
        """Сохраняет список символов в JSON файл"""
        if path is None:
            path = os.path.join(os.path.dirname(__file__), 'symbols_list.json')
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(symbols, f, ensure_ascii=False, indent=2)
            print(f"✓ Сохранено {len(symbols)} символов в {path}")
        except IOError as e:
            print(f"✗ Ошибка при сохранении: {e}")

    def close(self):
        """Закрывает браузер"""
        self.driver.quit()


def main():
    """Основная функция для парсинга коллекций"""
    parser = None
    
    try:
        parser = FragmentCollectionsParser()
        
        print("=" * 50)
        print("ПАРСИНГ КОЛЛЕКЦИЙ С FRAGMENT.COM")
        print("=" * 50)
        
        collections = parser.parse_collections()
        
        if collections:
            # Сохраняем в JSON
            parser.save_collections(collections, 'collections_list.json')
            
            # Выводим результат в консоль
            print("\n" + "=" * 50)
            print("СПИСОК КОЛЛЕКЦИЙ:")
            print("=" * 50)
            print(json.dumps(collections, ensure_ascii=False, indent=2))
        else:
            print("✗ Не удалось найти коллекции")
        
    except KeyboardInterrupt:
        print("\n⚠ Прервано пользователем")
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if parser:
            parser.close()


def main_backdrops():
    """Основная функция для парсинга бэкдропов"""
    parser = None
    
    try:
        parser = FragmentCollectionsParser()
        
        print("=" * 50)
        print("ПАРСИНГ БЭКДРОПОВ С FRAGMENT.COM")
        print("=" * 50)
        
        backdrops = parser.parse_backdrops()
        
        if backdrops:
            # Сохраняем в JSON
            parser.save_backdrops(backdrops, 'backdrops_list.json')
            
            # Выводим результат в консоль
            print("\n" + "=" * 50)
            print("СПИСОК БЭКДРОПОВ:")
            print("=" * 50)
            print(json.dumps(backdrops, ensure_ascii=False, indent=2))
        else:
            print("✗ Не удалось найти бэкдропы")
        
    except KeyboardInterrupt:
        print("\n⚠ Прервано пользователем")
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if parser:
            parser.close()


def main_symbols():
    """Основная функция для парсинга символов"""
    parser = None
    
    try:
        parser = FragmentCollectionsParser()
        
        print("=" * 50)
        print("ПАРСИНГ СИМВОЛОВ С FRAGMENT.COM")
        print("=" * 50)
        
        symbols = parser.parse_symbols()
        
        if symbols:
            # Сохраняем в JSON
            parser.save_symbols(symbols, 'symbols_list.json')
            
            # Выводим результат в консоль
            print("\n" + "=" * 50)
            print("СПИСОК СИМВОЛОВ:")
            print("=" * 50)
            print(json.dumps(symbols, ensure_ascii=False, indent=2))
        else:
            print("✗ Не удалось найти символы")
        
    except KeyboardInterrupt:
        print("\n⚠ Прервано пользователем")
    except Exception as e:
        print(f"✗ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if parser:
            parser.close()


if __name__ == "__main__":
    import sys
    
    # Если передан аргумент, парсим соответствующий тип данных
    if len(sys.argv) > 1:
        if sys.argv[1] == "backdrops":
            main_backdrops()
        elif sys.argv[1] == "symbols":
            main_symbols()
        else:
            main()
    else:
        main()

