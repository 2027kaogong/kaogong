/* ===== 刷题模块 ===== */
const PracticePage = {
  currentQuestions: [],
  currentIndex: 0,
  answered: false,
  currentMode: 'normal', // normal / idiom
  isRandom: false,
  useTimer: false,
  timerSeconds: 0,
  timerInterval: null,
  answers: {}, // { questionIndex: { userAnswer, isCorrect } } 回溯状态

  // 课程选择页
  async render(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">选择课程</div>
        <div class="course-grid">
          ${Utils.courses.map(c => `
            <div class="course-card" onclick="PracticePage.selectCourse('${c.id}')">
              <div class="course-card-icon">${c.icon}</div>
              <div class="course-card-name">${c.name}</div>
              <div class="course-card-count">${c.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">练习设置</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
          <span class="filter-chip ${this.isRandom ? 'active' : ''}" onclick="PracticePage.toggleRandom()">
            ${this.isRandom ? '✅ 随机模式' : '📋 顺序模式'}
          </span>
          <span class="filter-chip ${this.useTimer ? 'active' : ''}" onclick="PracticePage.toggleTimer()">
            ${this.useTimer ? '⏱️ 计时中' : '⏱️ 计时器'}
          </span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">添加题目</div>
        <div class="text-secondary" style="font-size:14px;margin-bottom:12px;">
          还没有录入题目？先添加一些题目再开始练习吧。
        </div>
        <button class="btn btn-primary btn-block" onclick="App.navigate('add-question')">
          ✏️ 添加新题目
        </button>
      </div>
    `;
  },

  toggleRandom() {
    this.isRandom = !this.isRandom;
    this.render(document.getElementById('app-content'));
  },
  toggleTimer() {
    this.useTimer = !this.useTimer;
    this.render(document.getElementById('app-content'));
  },

  // 选择课程
  async selectCourse(courseId) {
    const modules = Utils.getCourseSubModules(courseId);
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="card">
        <div class="card-title">${Utils.courses.find(c => c.id === courseId).name}</div>
        <div class="course-grid">
          ${modules.map(m => `
            <div class="course-card" onclick="PracticePage.startModule('${courseId}','${m.id}')">
              <div class="course-card-icon">${m.icon}</div>
              <div class="course-card-name">${m.name}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <button class="btn btn-ghost btn-block mt-8" onclick="App.navigate('practice')">
        ← 返回课程列表
      </button>
    `;
  },

  // 开始某个子模块
  async startModule(courseId, moduleId) {
    if (moduleId === 'idiom') {
      this.currentMode = 'idiom';
      this.startIdiomQuiz();
      return;
    }
    if (moduleId === 'idiom-search') {
      this.renderIdiomSearch(document.getElementById('app-content'));
      return;
    }
    this.currentMode = 'normal';
    const questions = await DB.getQuestionsByCourse(courseId);
    if (questions.length === 0) {
      Utils.toast('该课程还没有题目，请先添加题目');
      return;
    }
    this.currentQuestions = this.isRandom ? Utils.shuffle(questions) : questions;
    this.currentIndex = 0;
    this.answered = false;
    this.answers = {};
    this.timerSeconds = 0;
    this.startTimer();
    this.renderQuestion();
  },

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (!this.useTimer) return;
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
    }, 1000);
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  formatTimer(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  // 渲染题目
  renderQuestion() {
    const content = document.getElementById('app-content');
    const q = this.currentQuestions[this.currentIndex];
    if (!q) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">没有更多题目了</div><button class="btn btn-primary" onclick="App.navigate('practice')">返回</button></div>`;
      return;
    }

    const total = this.currentQuestions.length;
    const idx = this.currentIndex + 1;
    const previousAnswer = this.answers[this.currentIndex];
    const wasAnswered = !!previousAnswer;

    content.innerHTML = `
      <div class="card">
        <div class="question-progress">
          <span>${idx}/${total}</span>
          ${this.useTimer ? `<span style="color:var(--accent);font-weight:600;">⏱️ ${this.formatTimer(this.timerSeconds)}</span>` : ''}
          <div class="question-progress-bar">
            <div class="question-progress-fill" style="width:${(idx/total*100)}%"></div>
          </div>
        </div>
        <div class="question-category">${q.course}</div>
        <div class="question-text">${Utils.escapeHtml(q.question)}</div>
        <div class="question-options" id="options-container">
          ${q.options.map((opt, i) => `
            <div class="option-item ${previousAnswer ? (i === q.answer ? 'correct' : (i === previousAnswer.userAnswer && !previousAnswer.isCorrect ? 'wrong' : '')) : ''}"
                 data-index="${i}" onclick="PracticePage.selectOption(${i})">
              <div class="option-letter">${Utils.optionLabel(i)}</div>
              <span>${Utils.escapeHtml(opt.replace(/^[A-D]\.\s*/, ''))}</span>
            </div>
          `).join('')}
        </div>
        <div id="analysis-area">
          ${wasAnswered ? `
            <div class="analysis-panel ${previousAnswer.isCorrect ? 'correct-border' : 'wrong-border'}">
              <div style="font-weight:600;font-size:16px;margin-bottom:8px;color:${previousAnswer.isCorrect ? 'var(--success)' : 'var(--error)'}">
                ${previousAnswer.isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}
              </div>
              <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;">
                ${q.explanation || '暂无解析'}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="question-bottom">
          ${this.currentIndex > 0 ? `<button class="btn btn-ghost" onclick="PracticePage.prevQuestion()">上一题</button>` : ''}
          <button class="btn btn-primary" id="confirm-btn" onclick="PracticePage.confirmAnswer()"
            ${wasAnswered ? 'disabled' : ''}>
            ${wasAnswered ? '已作答' : '确认答案'}
          </button>
          <button class="btn btn-ghost" onclick="PracticePage.nextQuestion()" id="next-btn"
            style="${wasAnswered ? '' : 'display:none;'}">${this.currentIndex < total - 1 ? '下一题' : '完成'}</button>
        </div>
      </div>
    `;
  },

  selectOption(index) {
    if (this.answered) return;
    const prev = this.answers[this.currentIndex];
    if (prev) return; // 已作答不能重新选择
    document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.option-item[data-index="${index}"]`).classList.add('selected');
  },

  async confirmAnswer() {
    if (this.answered) return;
    const prev = this.answers[this.currentIndex];
    if (prev) return;

    const selected = document.querySelector('.option-item.selected');
    if (!selected) { Utils.toast('请先选择一个选项'); return; }

    this.answered = true;
    const q = this.currentQuestions[this.currentIndex];
    const userAnswer = parseInt(selected.dataset.index);
    const isCorrect = userAnswer === q.answer;

    // 保存答题状态
    this.answers[this.currentIndex] = { userAnswer, isCorrect };

    // 高亮显示
    document.querySelectorAll('.option-item').forEach((el, i) => {
      if (i === q.answer) el.classList.add('correct');
      if (i === userAnswer && !isCorrect) el.classList.add('wrong');
    });

    // 显示解析
    document.getElementById('analysis-area').innerHTML = `
      <div class="analysis-panel ${isCorrect ? 'correct-border' : 'wrong-border'}">
        <div style="font-weight:600;font-size:16px;margin-bottom:8px;color:${isCorrect ? 'var(--success)' : 'var(--error)'}">
          ${isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}
        </div>
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;">
          ${q.explanation || '暂无解析'}
        </div>
      </div>
    `;

    document.getElementById('confirm-btn').disabled = true;
    document.getElementById('confirm-btn').textContent = '已作答';
    document.getElementById('next-btn').style.display = '';

    // 保存记录到 IndexedDB
    const record = {
      id: Utils.uid(),
      questionId: q.id,
      course: q.course,
      userAnswer: userAnswer,
      isCorrect: isCorrect,
      timestamp: new Date().toISOString(),
      timeSpent: this.timerSeconds
    };
    await DB.add('records', record);

    // 错题记录
    if (!isCorrect) {
      const existing = await DB.getAllByIndex('errors', 'questionId', q.id);
      if (existing.length === 0) {
        await DB.add('errors', {
          id: Utils.uid(),
          questionId: q.id,
          course: q.course,
          wrongCount: 1,
          mastered: false,
          notes: { text: '', voiceText: '', images: [] },
          lastWrongDate: Utils.today(),
          reviewedDates: []
        });
      } else {
        existing[0].wrongCount++;
        existing[0].lastWrongDate = Utils.today();
        await DB.put('errors', existing[0]);
      }
    }
  },

  prevQuestion() {
    if (this.currentIndex <= 0) return;
    this.currentIndex--;
    this.answered = false;
    this.renderQuestion();
  },

  nextQuestion() {
    if (this.currentIndex < this.currentQuestions.length - 1) {
      this.currentIndex++;
      this.answered = false;
      this.renderQuestion();
    } else {
      this.stopTimer();
      // 显示完成摘要
      const total = this.currentQuestions.length;
      const correctCount = Object.values(this.answers).filter(a => a.isCorrect).length;
      const accuracy = total > 0 ? Math.round(correctCount / total * 100) : 0;
      const content = document.getElementById('app-content');
      content.innerHTML = `
        <div class="card text-center" style="padding:30px 20px;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:8px;">练习完成！</div>
          <div class="stat-grid">
            <div class="stat-item">
              <div class="stat-number">${total}</div>
              <div class="stat-label">总题数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number" style="color:var(--success);">${correctCount}</div>
              <div class="stat-label">正确</div>
            </div>
            <div class="stat-item">
              <div class="stat-number" style="color:${accuracy >= 70 ? 'var(--success)' : 'var(--error)'}">${accuracy}%</div>
              <div class="stat-label">正确率</div>
            </div>
          </div>
          ${this.useTimer ? `<div style="margin-top:12px;color:var(--text-secondary);font-size:14px;">⏱️ 用时 ${this.formatTimer(this.timerSeconds)}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">
            <button class="btn btn-primary" onclick="App.navigate('practice')">继续练习</button>
            <button class="btn btn-outline" onclick="App.navigate('home')">回到首页</button>
          </div>
        </div>
      `;
    }
  },

  // ===== 成语辨析 =====
  async startIdiomQuiz() {
    const idioms = await DB.getAll('idioms');
    if (idioms.length === 0) {
      Utils.toast('成语数据加载失败');
      return;
    }
    this.idioms = Utils.shuffle(idioms);
    this.idiomIndex = 0;
    this.idiomAnswers = {};
    this.answered = false;
    this.timerSeconds = 0;
    this.startTimer();
    this.renderIdiomQuestion();
  },

  renderIdiomQuestion() {
    const content = document.getElementById('app-content');
    const idiom = this.idioms[this.idiomIndex];
    if (!idiom) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎊</div><div class="empty-state-text">成语辨析全部完成！</div><button class="btn btn-primary" onclick="App.navigate('practice')">返回</button></div>`;
      return;
    }

    const total = this.idioms.length;
    const idx = this.idiomIndex + 1;
    const prevAnswer = this.idiomAnswers[this.idiomIndex];
    const wasAnswered = !!prevAnswer;

    // 生成干扰选项
    const allMeanings = Utils.shuffle(this.idioms.filter(i => i.word !== idiom.word)).slice(0, 3);
    const options = Utils.shuffle([
      { text: idiom.meaning, correct: true },
      ...allMeanings.map(i => ({ text: i.meaning, correct: false }))
    ]);

    content.innerHTML = `
      <div class="card">
        <div class="question-progress">
          <span>成语 ${idx}/${total}</span>
          ${this.useTimer ? `<span style="color:var(--accent);font-weight:600;">⏱️ ${this.formatTimer(this.timerSeconds)}</span>` : ''}
          <div class="question-progress-bar">
            <div class="question-progress-fill" style="width:${(idx/total*100)}%"></div>
          </div>
        </div>
        <div class="question-text" style="text-align:center;font-size:28px;font-weight:700;color:var(--primary);padding:20px 0;">
          ${idiom.word}
        </div>
        <div style="text-align:center;color:var(--text-light);margin-bottom:16px;">${idiom.pinyin}</div>
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;">请选择正确的释义：</div>
        <div id="idiom-options">
          ${options.map((opt, i) => {
            let cls = '';
            if (wasAnswered) {
              if (opt.correct) cls = 'correct';
              else if (i === prevAnswer) cls = 'wrong';
            }
            return `
              <div class="idiom-quiz-option ${cls}" data-correct="${opt.correct}" data-idx="${i}" onclick="PracticePage.selectIdiomOption(this)">
                <span>${Utils.optionLabel(i)}. ${opt.text}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div id="idiom-analysis">
          ${wasAnswered ? `
            <div class="analysis-panel ${prevAnswer.isCorrect ? 'correct-border' : 'wrong-border'}">
              <div style="font-weight:600;font-size:16px;margin-bottom:8px;color:${prevAnswer.isCorrect ? 'var(--success)' : 'var(--error)'}">
                ${prevAnswer.isCorrect ? '✅ 正确！' : '❌ 错误'}
              </div>
              <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${idiom.word}（${idiom.pinyin}）</div>
              <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:8px;">${idiom.meaning}</div>
              <div class="idiom-example">
                <div class="idiom-example-label">📰 ${idiom.source}例句：</div>
                ${idiom.example}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="question-bottom">
          ${this.idiomIndex > 0 ? `<button class="btn btn-ghost" onclick="PracticePage.prevIdiom()">上一题</button>` : ''}
          <button class="btn btn-primary" onclick="PracticePage.confirmIdiomAnswer()" id="idiom-confirm-btn"
            ${wasAnswered ? 'disabled' : ''}>${wasAnswered ? '已作答' : '确认'}</button>
          <button class="btn btn-ghost" onclick="PracticePage.nextIdiom()" id="idiom-next-btn"
            style="${wasAnswered ? '' : 'display:none;'}">${this.idiomIndex < total - 1 ? '下一题' : '完成'}</button>
        </div>
      </div>
    `;
  },

  selectIdiomOption(el) {
    if (this.answered) return;
    if (this.idiomAnswers[this.idiomIndex]) return;
    document.querySelectorAll('.idiom-quiz-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
  },

  confirmIdiomAnswer() {
    if (this.answered) return;
    if (this.idiomAnswers[this.idiomIndex]) return;

    const selected = document.querySelector('.idiom-quiz-option.selected');
    if (!selected) { Utils.toast('请选择一个选项'); return; }

    this.answered = true;
    const isCorrect = selected.dataset.correct === 'true';
    const selectedIdx = parseInt(selected.dataset.idx);

    // 保存状态
    this.idiomAnswers[this.idiomIndex] = { userAnswer: selectedIdx, isCorrect };

    document.querySelectorAll('.idiom-quiz-option').forEach(el => {
      if (el.dataset.correct === 'true') el.classList.add('correct');
    });
    if (!isCorrect) selected.classList.add('wrong');

    const idiom = this.idioms[this.idiomIndex];
    document.getElementById('idiom-analysis').innerHTML = `
      <div class="analysis-panel ${isCorrect ? 'correct-border' : 'wrong-border'}">
        <div style="font-weight:600;font-size:16px;margin-bottom:8px;color:${isCorrect ? 'var(--success)' : 'var(--error)'}">
          ${isCorrect ? '✅ 正确！' : '❌ 错误'}
        </div>
        <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${idiom.word}（${idiom.pinyin}）</div>
        <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:8px;">${idiom.meaning}</div>
        <div class="idiom-example">
          <div class="idiom-example-label">📰 ${idiom.source}例句：</div>
          ${idiom.example}
        </div>
      </div>
    `;

    document.getElementById('idiom-confirm-btn').disabled = true;
    document.getElementById('idiom-confirm-btn').textContent = '已作答';
    document.getElementById('idiom-next-btn').style.display = '';
  },

  prevIdiom() {
    if (this.idiomIndex <= 0) return;
    this.idiomIndex--;
    this.answered = false;
    this.renderIdiomQuestion();
  },

  nextIdiom() {
    if (this.idiomIndex < this.idioms.length - 1) {
      this.idiomIndex++;
      this.answered = false;
      this.renderIdiomQuestion();
    } else {
      this.stopTimer();
      const total = Object.keys(this.idiomAnswers).length;
      const correctCount = Object.values(this.idiomAnswers).filter(a => a.isCorrect).length;
      const accuracy = total > 0 ? Math.round(correctCount / total * 100) : 0;
      const content = document.getElementById('app-content');
      content.innerHTML = `
        <div class="card text-center" style="padding:30px 20px;">
          <div style="font-size:48px;margin-bottom:12px;">🎊</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:8px;">成语练习完成！</div>
          <div class="stat-grid">
            <div class="stat-item"><div class="stat-number">${total}</div><div class="stat-label">练习成语</div></div>
            <div class="stat-item"><div class="stat-number" style="color:var(--success);">${correctCount}</div><div class="stat-label">正确</div></div>
            <div class="stat-item"><div class="stat-number" style="color:${accuracy >= 70 ? 'var(--success)' : 'var(--error)'}">${accuracy}%</div><div class="stat-label">正确率</div></div>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">
            <button class="btn btn-primary" onclick="App.navigate('practice')">继续练习</button>
            <button class="btn btn-outline" onclick="App.navigate('home')">回到首页</button>
          </div>
        </div>
      `;
    }
  },

  // ===== 成语搜索 =====
  async renderIdiomSearch(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">🔍 搜索成语</div>
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <input class="input-field" id="idiom-search-input" placeholder="输入成语名称，例如：举足轻重" style="flex:1;" onkeydown="if(event.key==='Enter')PracticePage.doIdiomSearch()">
          <button class="btn btn-primary" onclick="PracticePage.doIdiomSearch()">搜索</button>
        </div>
        <div class="text-secondary" style="font-size:13px;">
          共收录 <strong style="color:var(--primary);">2238</strong> 个花生十三高频成语，优先从本地搜索
        </div>
      </div>
      <div id="idiom-search-results"></div>
      <button class="btn btn-ghost btn-block mt-8" onclick="App.navigate('practice')">← 返回课程列表</button>
    `;
    // 自动聚焦搜索框
    setTimeout(() => document.getElementById('idiom-search-input')?.focus(), 300);
  },

  async doIdiomSearch() {
    const query = document.getElementById('idiom-search-input').value.trim();
    if (!query) { Utils.toast('请输入成语名称'); return; }

    const resultsDiv = document.getElementById('idiom-search-results');
    resultsDiv.innerHTML = '<div class="text-secondary" style="text-align:center;padding:20px;">🔍 搜索中...<br><span style="font-size:12px;">正在查询本地数据库和网络资源</span></div>';

    // 1. 先从本地数据库搜索
    const allIdioms = await DB.getAll('idioms');
    const localResults = allIdioms.filter(i => i.word.includes(query) || query.includes(i.word));

    let html = '';

    // 显示本地搜索结果（含网络缓存数据）
    if (localResults.length > 0) {
      html += `<div class="card"><div class="card-title">📚 本地结果（${localResults.length}个匹配）</div>`;
      localResults.forEach(idiom => {
        // 查看是否有网络缓存数据
        const cached = window.WEB_IDIOM_CACHE && WEB_IDIOM_CACHE[idiom.word];
        const hasOnline = !!cached;
        html += `
          <div class="idiom-card">
            <div class="idiom-word">${idiom.word}</div>
            ${cached ? `<div class="idiom-pinyin">${cached.pinyin || ''}</div>` : (idiom.pinyin ? `<div class="idiom-pinyin">${idiom.pinyin}</div>` : '')}
            <div class="idiom-meaning">${cached ? cached.meaning : (idiom.meaning || '来自花生十三高频成语')}</div>
            ${cached ? `
              <div class="idiom-example" style="margin-top:6px;">
                <div class="idiom-example-label">📰 ${cached.source || '网络'}例句：</div>
                ${cached.example}
              </div>
              ${cached.derivation ? `<div style="font-size:12px;color:var(--text-light);margin-top:4px;">📖 出处：${cached.derivation}</div>` : ''}
            ` : ''}
            <div style="font-size:12px;color:var(--text-light);margin-top:2px;">
              📖 来源：${cached ? `${idiom.source || '花生十三'} + 网络` : (idiom.source || '花生十三')}
              ${hasOnline ? ' ✅ 含例句' : ''}
            </div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
              ${!hasOnline ? `<button class="btn btn-sm btn-outline" onclick="PracticePage.fetchOnlineMeaning('${idiom.word}')">🌐 获取释义+例句</button>` : ''}
              <button class="btn btn-sm btn-ghost" onclick="PracticePage.openBaiduSearch('${idiom.word}')">🔍 百度搜索</button>
            </div>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += `<div class="card"><div class="text-secondary">📖 本地未找到「${Utils.escapeHtml(query)}」，尝试网络搜索中...</div></div>`;
    }

    // 2. 网络搜索结果（加载中 / 嵌入iframe）
    html += `
      <div class="card">
        <div class="card-title">🌐 网络搜索结果</div>
        <div class="text-secondary" style="font-size:14px;line-height:1.6;margin-bottom:12px;">
          以下是在线词典对「${Utils.escapeHtml(query)}」的查询结果
        </div>
        <div id="online-result" class="text-secondary" style="text-align:center;padding:12px;">
          ⏳ 正在查询网络词典...
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
          <a class="btn btn-sm btn-outline" href="https://www.baidu.com/s?wd=${encodeURIComponent(query + ' 成语 释义 例句')}" target="_blank" rel="noopener">🔍 百度搜索</a>
          <a class="btn btn-sm btn-outline" href="https://hanyu.baidu.com/s?wd=${encodeURIComponent(query)}&from=haosheng" target="_blank" rel="noopener">📖 百度汉语</a>
          <a class="btn btn-sm btn-outline" href="https://so.gushi.ci/${encodeURIComponent(query)}" target="_blank" rel="noopener">📜 古诗文网</a>
        </div>
      </div>
    `;

    resultsDiv.innerHTML = html;

    // 3. 异步获取网络数据
    this.fetchOnlineIdiom(query);
  },

  // 从网络获取成语释义和例句并显示
  async fetchOnlineIdiom(query) {
    const onlineDiv = document.getElementById('online-result');
    if (!onlineDiv) return;

    // 由于浏览器安全限制(CORS)，PWA无法直接跨域抓取网络内容
    // 提供快捷链接让用户在新标签页查看
    onlineDiv.innerHTML = `
      <div style="font-size:14px;">
        <p style="margin-bottom:10px;">打开以下链接查看「${Utils.escapeHtml(query)}」的详细释义和例句：</p>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a class="btn btn-outline btn-sm btn-block" href="https://hanyu.baidu.com/s?wd=${encodeURIComponent(query)}&from=haosheng" target="_blank" rel="noopener" style="justify-content:flex-start;">
            📖 百度汉语 - 拼音、释义、出处
          </a>
          <a class="btn btn-outline btn-sm btn-block" href="https://www.baidu.com/s?wd=${encodeURIComponent(query + ' 人民日报 例句')}" target="_blank" rel="noopener" style="justify-content:flex-start;">
            📰 人民日报例句 
          </a>
          <a class="btn btn-outline btn-sm btn-block" href="https://www.baidu.com/s?wd=${encodeURIComponent(query + ' 成语 造句 示例')}" target="_blank" rel="noopener" style="justify-content:flex-start;">
            ✍️ 例句搜索
          </a>
        </div>
      </div>
    `;
  },

  // 使用WebFetch从服务端获取成语信息（点击后通知我搜索）
  async fetchOnlineMeaning(idiomWord) {
    App.showModal(`
      <h3 style="margin-bottom:12px;">🌐 联网查询「${idiomWord}」</h3>
      <div class="text-secondary" style="font-size:14px;line-height:1.6;margin-bottom:16px;">
        联网查询功能需要我帮你在网上搜索。点击下方按钮，我会从网络获取该成语的释义和人民日报例句。
      </div>
      <button class="btn btn-primary btn-block" onclick="PracticePage.closeAndNotify('${idiomWord}')">
        帮我搜索联网例句
      </button>
      <button class="btn btn-ghost btn-block mt-8" onclick="App.closeModal()">取消</button>
    `);
  },

  closeAndNotify(idiomWord) {
    App.closeModal();
    Utils.toast('✅ 好的，我会帮你查「' + idiomWord + '」的网络例句');
  },

  openBaiduSearch(idiomWord) {
    window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(idiomWord + ' 成语 释义 例句')}`, '_blank');
  },

  searchOnline(idiomWord) {
    App.showModal(`
      <h3 style="margin-bottom:12px;">🌐 搜索「${idiomWord}」</h3>
      <div class="text-secondary" style="font-size:14px;line-height:1.6;margin-bottom:16px;">
        点击以下链接在新标签页搜索例句
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a class="btn btn-outline btn-block" href="https://www.baidu.com/s?wd=${encodeURIComponent(idiomWord + ' 人民日报 例句')}" target="_blank" rel="noopener">📰 人民日报例句</a>
        <a class="btn btn-outline btn-block" href="https://so.gushi.ci/${encodeURIComponent(idiomWord)}" target="_blank" rel="noopener">📖 古诗文网</a>
        <a class="btn btn-outline btn-block" href="https://www.baidu.com/s?wd=${encodeURIComponent(idiomWord + ' 成语 释义')}" target="_blank" rel="noopener">🔍 百度百科</a>
      </div>
      <button class="btn btn-ghost btn-block mt-8" onclick="App.closeModal()">关闭</button>
    `);
  },

  // ===== 添加题目 =====
  renderAddQuestion(container) {
    const courses = Utils.courses;
    container.innerHTML = `
      <div class="card">
        <div class="card-title">添加新题目</div>
        <div class="input-group">
          <label>所属课程</label>
          <select class="input-field" id="add-q-course">
            ${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="input-group">
          <label>题目内容</label>
          <textarea class="input-field textarea-field" id="add-q-text" placeholder="请输入题目内容..." style="min-height:80px;"></textarea>
        </div>
        <div class="input-group">
          <label>选项A</label>
          <input class="input-field" id="add-q-opt0" placeholder="选项A的内容">
        </div>
        <div class="input-group">
          <label>选项B</label>
          <input class="input-field" id="add-q-opt1" placeholder="选项B的内容">
        </div>
        <div class="input-group">
          <label>选项C</label>
          <input class="input-field" id="add-q-opt2" placeholder="选项C的内容">
        </div>
        <div class="input-group">
          <label>选项D</label>
          <input class="input-field" id="add-q-opt3" placeholder="选项D的内容">
        </div>
        <div class="input-group">
          <label>正确答案</label>
          <select class="input-field" id="add-q-answer">
            <option value="0">A</option>
            <option value="1">B</option>
            <option value="2">C</option>
            <option value="3">D</option>
          </select>
        </div>
        <div class="input-group">
          <label>解析（选填）</label>
          <textarea class="input-field textarea-field" id="add-q-explanation" placeholder="输入答案解析..."></textarea>
        </div>
        <button class="btn btn-primary btn-block btn-lg" onclick="PracticePage.saveQuestion()">保存题目</button>
      </div>
    `;
  },

  async saveQuestion() {
    const course = document.getElementById('add-q-course').value;
    const question = document.getElementById('add-q-text').value.trim();
    const opts = [0,1,2,3].map(i => ({
      label: Utils.optionLabel(i),
      text: document.getElementById(`add-q-opt${i}`).value.trim()
    }));
    const answer = parseInt(document.getElementById('add-q-answer').value);
    const explanation = document.getElementById('add-q-explanation').value.trim();

    if (!question) { Utils.toast('请输入题目内容'); return; }
    if (opts.some(o => !o.text)) { Utils.toast('请填写所有选项'); return; }

    const q = {
      id: 'q_' + Utils.uid(),
      course: course,
      type: 'single',
      question: question,
      options: opts.map(o => `${o.label}. ${o.text}`),
      answer: answer,
      explanation: explanation,
      createdAt: new Date().toISOString()
    };

    try {
      await DB.add('questions', q);
      Utils.toast('✅ 题目添加成功！');
      App.navigate('practice');
    } catch (e) {
      Utils.toast('保存失败：' + e.message);
    }
  }
};
