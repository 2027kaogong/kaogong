/* ===== 主应用逻辑 ===== */
const App = {
  currentPage: 'home',
  router: {
    current: null,
    history: [],

    go(page, params) {
      this.history.push({ page: this.current, params: null });
      App.showPage(page, params);
    },

    back() {
      if (this.history.length > 0) {
        const prev = this.history.pop();
        App.showPage(prev.page, prev.params);
      }
    }
  },

  async init() {
    await DB.open();
    // 初始化成语数据
    try { await DB.initIdioms(); } catch(e) {}
    // 导入示例题目
    try { await DB.seedQuestions(); } catch(e) {}
    // 注册 Service Worker
    this.registerSW();
    // 加载主题
    const theme = Utils.getLocal('theme', 'light');
    document.documentElement.setAttribute('data-theme', theme);
    // 显示首页
    this.showPage('home');
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  navigate(page) {
    this.router.current = page;
    this.showPage(page);
  },

  showPage(page, params) {
    this.currentPage = page;
    const content = document.getElementById('app-content');
    content.innerHTML = '';

    // 更新导航
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // 显示/隐藏返回按钮
    const backBtn = document.getElementById('back-btn');
    const isMainPage = ['home', 'plan', 'practice', 'error-book', 'morning', 'statistics'].includes(page);
    backBtn.classList.toggle('hide', isMainPage);

    // 设置标题
    const titles = {
      home: '考公工作台',
      plan: '学习计划',
      practice: '刷题',
      'error-book': '错题本',
      morning: '申论晨读',
      statistics: '学习统计',
      'course-practice': '刷题练习',
      'idiom-practice': '成语辨析',
      'add-question': '添加题目',
      'add-plan': '创建计划',
      'error-detail': '错题详情',
      'checkin': '打卡记录',
      'add-morning': '添加晨读笔记'
    };
    document.getElementById('page-title').textContent = titles[page] || '考公工作台';

    // 渲染页面
    switch (page) {
      case 'home': HomePage.render(content); break;
      case 'plan': PlanPage.render(content); break;
      case 'practice': PracticePage.render(content); break;
      case 'error-book': ErrorBookPage.render(content); break;
      case 'morning': MorningPage.render(content); break;
      case 'statistics': StatisticsPage.render(content); break;
      default:
        if (page === 'add-question') PracticePage.renderAddQuestion(content);
        else if (page === 'add-plan') PlanPage.renderAddPlan(content);
        else if (page === 'add-morning') MorningPage.renderAddMorning(content);
        else content.innerHTML = '<div class="empty-state"><p>页面加载中...</p></div>';
    }
  },

  // 弹窗
  showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hide');
    document.getElementById('modal-body').innerHTML = html;
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hide');
  },

  // 暗色模式切换
  toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    Utils.setLocal('theme', next);
  }
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());
