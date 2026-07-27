/* ===== IndexedDB 数据库 ===== */
const DB = {
  DB_NAME: 'KaogongDB',
  DB_VERSION: 1,
  db: null,

  // 打开数据库
  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // 题库
        if (!db.objectStoreNames.contains('questions')) {
          const store = db.createObjectStore('questions', { keyPath: 'id' });
          store.createIndex('course', 'course', { unique: false });
        }
        // 答题记录
        if (!db.objectStoreNames.contains('records')) {
          const store = db.createObjectStore('records', { keyPath: 'id' });
          store.createIndex('course', 'course', { unique: false });
          store.createIndex('questionId', 'questionId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        // 错题
        if (!db.objectStoreNames.contains('errors')) {
          const store = db.createObjectStore('errors', { keyPath: 'id' });
          store.createIndex('course', 'course', { unique: false });
          store.createIndex('mastered', 'mastered', { unique: false });
        }
        // 学习计划
        if (!db.objectStoreNames.contains('plans')) {
          const store = db.createObjectStore('plans', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        // 打卡日历
        if (!db.objectStoreNames.contains('checkins')) {
          const store = db.createObjectStore('checkins', { keyPath: 'date' });
        }
        // 晨读笔记
        if (!db.objectStoreNames.contains('morning')) {
          const store = db.createObjectStore('morning', { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        // 成语数据
        if (!db.objectStoreNames.contains('idioms')) {
          db.createObjectStore('idioms', { keyPath: 'word' });
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // 通用 CRUD
  async add(storeName, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.add(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async put(storeName, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async get(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async getAllByIndex(storeName, indexName, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteAll(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // 获取所有数据（含分页或按日期范围）
  async getByDateRange(storeName, indexName, startDate, endDate) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const range = IDBKeyRange.bound(startDate, endDate);
      const req = index.getAll(range);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  // 统计
  async getStatsByDate(dateStr) {
    const records = await this.getAll('records');
    const dayRecords = records.filter(r => r.timestamp && r.timestamp.startsWith(dateStr));
    const total = dayRecords.length;
    const correct = dayRecords.filter(r => r.isCorrect).length;
    return { total, correct, rate: total > 0 ? Math.round(correct / total * 100) : 0 };
  },

  // 获取某门课程的所有题目
  async getQuestionsByCourse(courseId) {
    return this.getAllByIndex('questions', 'course', courseId);
  },

  // 导入示例题目（首次使用时）
  async seedQuestions() {
    const existing = await this.getAll('questions');
    if (existing.length > 0) return;
    const tx = this.db.transaction('questions', 'readwrite');
    const store = tx.objectStore('questions');
    for (const q of SAMPLE_QUESTIONS) {
      store.put(q);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  // 初始化成语数据（首次使用时）
  async initIdioms() {
    const existing = await this.getAll('idioms');
    if (existing.length > 0) return;
    // 批量插入成语
    const tx = this.db.transaction('idioms', 'readwrite');
    const store = tx.objectStore('idioms');
    for (const idiom of IDIOMS_DATA) {
      store.put(idiom);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }
};
