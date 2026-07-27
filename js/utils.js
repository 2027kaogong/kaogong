/* ===== 工具函数 ===== */
const Utils = {
  // 生成唯一 ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  // 今天日期 YYYY-MM-DD
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  // 格式化日期
  formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  // 格式化时间
  formatTime(isoStr) {
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  // 分钟转"X小时X分钟"
  formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0分钟';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
  },

  // 获取当月年月
  getYearMonth(date) {
    const d = date || new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  },

  // 获取某月的天数
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  },

  // 获取某月第一天是星期几 (0=日, 1=一, ...)
  getFirstDayOfMonth(year, month) {
    return new Date(year, month - 1, 1).getDay();
  },

  // 判断是否是今天
  isToday(dateStr) {
    return dateStr === Utils.today();
  },

  // 打乱数组
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // 取选项字母
  optionLabel(index) {
    return String.fromCharCode(65 + index); // A, B, C, D...
  },

  // Toast 通知
  toast(msg, duration = 2200) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  },

  // 安全的 localStorage
  setLocal(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* quota exceeded */ }
  },
  getLocal(key, def = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch { return def; }
  },

  // HTML 转义
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // 语音转文字
  speechToText() {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error('您的浏览器不支持语音识别，请使用 Chrome 浏览器'));
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        resolve(text);
      };
      recognition.onerror = (event) => {
        reject(new Error('语音识别出错: ' + event.error));
      };
      recognition.start();
    });
  },

  // 拍照 / 选图 (返回 base64)
  captureImage(useCamera = true) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (useCamera && /Android|iPhone/i.test(navigator.userAgent)) {
        input.capture = 'environment';
      }
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) { reject(new Error('未选择图片')); return; }
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(file);
      };
      input.click();
    });
  },

  // 课程列表
  courses: [
    { id: '花生十三_言语理解', name: '花生言语理解', icon: '🧠', desc: '花生十三言语理解与表达' },
    { id: '花生十三_判断逻辑', name: '花生判断逻辑', icon: '🔍', desc: '花生十三判断推理' },
    { id: '花生十三_资料分析', name: '花生资料分析', icon: '📊', desc: '花生十三资料分析' },
    { id: '上岸村小黑_政治理论', name: '政治理论', icon: '🏛️', desc: '上岸村小黑老师政治理论' },
    { id: '申论小马哥', name: '申论小马哥', icon: '✍️', desc: '申论小马哥' }
  ],

  // 学习计划模板
  planTemplates: [
    {
      name: '每日真题精练',
      items: ['言语理解 20题', '判断推理 20题', '资料分析 15题', '常识判断 10题']
    },
    {
      name: '专项突破计划',
      items: ['花生十三 言语精讲 1节', '对应练习 30题', '错题回顾 20题']
    },
    {
      name: '申论冲刺计划',
      items: ['申论晨读 30分钟', '申论小马哥 精讲 1节', '大作文框架练习 1篇', '素材积累 20分钟']
    },
    {
      name: '成语积累计划',
      items: ['成语辨析 20个', '人民日报例句仿写 5句', '错题成语复习']
    },
    {
      name: '周末强化计划',
      items: ['全科模拟 1套', '错题整理与复盘', '申论晨读 60分钟', '下周计划制定']
    }
  ],

  // 生成课程子模块
  getCourseSubModules(courseId) {
    if (courseId === '花生十三_言语理解') {
      return [
        { id: 'normal', name: '普通练习', icon: '📝' },
        { id: 'idiom', name: '成语辨析', icon: '📖' },
        { id: 'idiom-search', name: '搜索成语', icon: '🔍' }
      ];
    }
    return [{ id: 'normal', name: '开始练习', icon: '📝' }];
  }
};
