/* ===== 错题本模块 ===== */
const ErrorBookPage = {
  async render(container) {
    const errors = await DB.getAll('errors');
    const questions = await DB.getAll('questions');
    const records = await DB.getAll('records');
    const unmastered = errors.filter(e => !e.mastered);
    const mastered = errors.filter(e => e.mastered);

    // 智能推荐数量
    const todayRecCount = this.calcTodayReviewCount(unmastered);

    container.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <span class="card-title" style="margin-bottom:0;">错题本</span>
          <span>
            <span class="tag tag-red">${unmastered.length} 待复习</span>
            <span class="tag tag-gray">${mastered.length} 已掌握</span>
            <button class="header-btn" onclick="ErrorBookPage.showSettings()" title="错题设置" style="display:inline-flex;vertical-align:middle;margin-left:4px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </button>
          </span>
        </div>
        ${todayRecCount > 0 ? `
          <div style="margin-top:8px;padding:8px 12px;background:#fff3e0;border-radius:var(--radius-sm);border-left:3px solid var(--accent);">
            <span style="font-size:14px;font-weight:500;">📋 今日应复习 <strong style="color:var(--accent);">${todayRecCount}</strong> 题</span>
            <button class="btn btn-sm btn-primary" style="float:right;" onclick="ErrorBookPage.reviewToday()">去复习</button>
          </div>
        ` : ''}
      </div>

      <div class="quick-actions" style="margin-bottom:12px;">
        <div class="action-card" onclick="ErrorBookPage.reviewToday()">
          <div class="action-card-icon">🔄</div>
          <div class="action-card-label">今日推荐复习</div>
          ${todayRecCount > 0 ? `<span class="tag tag-red" style="font-size:10px;margin-top:2px;">${todayRecCount}题</span>` : ''}
        </div>
        <div class="action-card" onclick="ErrorBookPage.generateErrorSet()">
          <div class="action-card-icon">📋</div>
          <div class="action-card-label">生成错题集</div>
        </div>
        <div class="action-card" onclick="ErrorBookPage.quickReview()">
          <div class="action-card-icon">⚡</div>
          <div class="action-card-label">一键复习</div>
        </div>
      </div>

      <div class="filter-bar" id="error-filter-bar">
        <div class="filter-chip active" data-filter="all" onclick="ErrorBookPage.filterErrors('all')">全部</div>
        ${Utils.courses.map(c => `
          <div class="filter-chip" data-filter="${c.id}" onclick="ErrorBookPage.filterErrors('${c.id}')">${c.name}</div>
        `).join('')}
        <div class="filter-chip" data-filter="mastered" onclick="ErrorBookPage.filterErrors('mastered')">已掌握</div>
      </div>

      <div id="error-list">
        ${unmastered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">🎉</div>
            <div class="empty-state-text">没有错题，继续保持！</div>
          </div>
        ` : unmastered.map(e => {
          const q = questions.find(q => q.id === e.questionId);
          const recDays = this.daysSince(e.lastWrongDate || e.id);
          return `
            <div class="error-item" data-course="${e.course}" data-mastered="${e.mastered}">
              <div class="error-item-header">
                <div>
                  <span class="tag tag-blue">${e.course}</span>
                  <span class="tag tag-red">❌ ${e.wrongCount}次</span>
                  ${recDays <= 1 ? '<span class="tag tag-orange">今日新错</span>' : ''}
                </div>
                <button class="btn btn-sm btn-ghost" onclick="ErrorBookPage.showDetail('${e.id}')">详情</button>
              </div>
              <div class="error-question-text">
                ${q ? Utils.escapeHtml(q.question.substring(0, 80)) : '题目已删除'}${q && q.question.length > 80 ? '...' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // 计算今日推荐复习数量
  calcTodayReviewCount(errors) {
    let count = 0;
    for (const e of errors) {
      const days = this.daysSince(e.lastWrongDate || e.id);
      const score = e.wrongCount * (1 + Math.max(0, 3 - days));
      if (score >= 2) count++;
    }
    return Math.min(count, errors.length);
  },

  // 计算距离今天的天数
  daysSince(dateStr) {
    if (!dateStr) return 999;
    const d1 = new Date(dateStr.slice(0, 10));
    const d2 = new Date();
    return Math.floor((d2 - d1) / 86400000);
  },

  filterErrors(filter) {
    document.querySelectorAll('#error-filter-bar .filter-chip').forEach(el => {
      el.classList.toggle('active', el.dataset.filter === filter);
    });
    document.querySelectorAll('.error-item').forEach(el => {
      if (filter === 'all') { el.style.display = ''; return; }
      if (filter === 'mastered') {
        el.style.display = el.dataset.mastered === 'true' ? '' : 'none';
        return;
      }
      el.style.display = el.dataset.course === filter ? '' : 'none';
    });
  },

  async showDetail(errorId) {
    const errors = await DB.getAll('errors');
    const questions = await DB.getAll('questions');
    const error = errors.find(e => e.id === errorId);
    if (!error) { Utils.toast('错题记录不存在'); return; }
    const q = questions.find(q => q.id === error.questionId);

    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="card">
        <div class="card-title">错题详情</div>
        <div style="margin-bottom:8px;">
          <span class="tag tag-blue">${error.course}</span>
          <span class="tag tag-red">❌ 错了${error.wrongCount}次</span>
          ${error.mastered ? '<span class="tag tag-green">✅ 已掌握</span>' : ''}
          <span class="tag tag-gray">最后错：${error.lastWrongDate || '未知'}</span>
        </div>
        ${q ? `
          <div class="question-text">${Utils.escapeHtml(q.question)}</div>
          <div class="question-options">
            ${q.options.map((opt, i) => `
              <div class="option-item ${i === q.answer ? 'correct' : ''}">
                <div class="option-letter">${Utils.optionLabel(i)}</div>
                <span>${Utils.escapeHtml(opt.replace(/^[A-D]\.\s*/, ''))}</span>
              </div>
            `).join('')}
          </div>
          ${q.explanation ? `
            <div class="analysis-panel correct-border mt-12">
              <div style="font-weight:600;margin-bottom:4px;">📖 解析</div>
              <div style="font-size:14px;color:var(--text-secondary);">${q.explanation}</div>
            </div>
          ` : ''}
        ` : '<div class="text-secondary">题目已删除</div>'}
      </div>

      <!-- 错题笔记 -->
      <div class="card" id="error-notes-card">
        <div class="card-title">我的笔记</div>
        ${error.notes.text ? `
          <div style="font-size:14px;line-height:1.6;margin-bottom:8px;padding:8px;background:var(--bg);border-radius:var(--radius-sm);">
            ✏️ ${Utils.escapeHtml(error.notes.text)}
          </div>
        ` : ''}
        ${error.notes.voiceText ? `
          <div style="font-size:14px;line-height:1.6;margin-bottom:8px;padding:8px;background:var(--bg);border-radius:var(--radius-sm);border-left:3px solid var(--accent);">
            <span style="font-weight:500;">🎤 语音笔记：</span>${Utils.escapeHtml(error.notes.voiceText)}
          </div>
        ` : ''}
        ${error.notes.images && error.notes.images.length > 0 ? `
          <div class="error-note-images">
            ${error.notes.images.map(img => `<img src="${img}" class="error-note-image" onclick="ErrorBookPage.viewImage('${img}')">`).join('')}
          </div>
        ` : ''}
        <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" onclick="ErrorBookPage.addVoiceNote('${error.id}')">🎤 语音</button>
          <button class="btn btn-sm btn-outline" onclick="ErrorBookPage.addPhoto('${error.id}')">📸 拍照</button>
          <button class="btn btn-sm btn-outline" onclick="ErrorBookPage.addTextNote('${error.id}')">✏️ 文字</button>
          <button class="btn btn-sm btn-ghost" onclick="ErrorBookPage.deletePhoto('${error.id}')" style="color:var(--error);">🗑️ 清空图片</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        ${!error.mastered ? `
          <button class="btn btn-success" onclick="ErrorBookPage.markMastered('${error.id}')">✅ 标记已掌握</button>
          <button class="btn btn-outline" onclick="ErrorBookPage.reviewSingle('${error.id}')">📖 重新练习</button>
        ` : `
          <button class="btn btn-ghost" onclick="ErrorBookPage.unmarkMastered('${error.id}')">↩️ 重新标记为未掌握</button>
        `}
        <button class="btn btn-ghost" onclick="App.navigate('error-book')">← 返回</button>
      </div>
    `;
  },

  async addVoiceNote(errorId) {
    Utils.toast('🎤 请说话...');
    try {
      const text = await Utils.speechToText();
      const errors = await DB.getAll('errors');
      const error = errors.find(e => e.id === errorId);
      if (error) {
        error.notes = error.notes || { text: '', voiceText: '', images: [] };
        error.notes.voiceText = (error.notes.voiceText ? error.notes.voiceText + '\n' : '') + text;
        await DB.put('errors', error);
        Utils.toast('✅ 语音笔记已保存');
        this.showDetail(errorId);
      }
    } catch (e) {
      Utils.toast(e.message);
    }
  },

  async addPhoto(errorId) {
    try {
      const img = await Utils.captureImage();
      const errors = await DB.getAll('errors');
      const error = errors.find(e => e.id === errorId);
      if (error) {
        error.notes = error.notes || { text: '', voiceText: '', images: [] };
        error.notes.images.push(img);
        await DB.put('errors', error);
        Utils.toast('✅ 照片已保存');
        this.showDetail(errorId);
      }
    } catch (e) {
      Utils.toast(e.message || '取消拍照');
    }
  },

  async deletePhoto(errorId) {
    const errors = await DB.getAll('errors');
    const error = errors.find(e => e.id === errorId);
    if (error && error.notes && error.notes.images.length > 0) {
      error.notes.images = [];
      await DB.put('errors', error);
      Utils.toast('已清空图片');
      this.showDetail(errorId);
    }
  },

  async addTextNote(errorId) {
    App.showModal(`
      <h3 style="margin-bottom:12px;">添加文字备注</h3>
      <textarea class="input-field textarea-field" id="note-text-input" placeholder="输入你的错题分析..." style="min-height:100px;"></textarea>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" onclick="ErrorBookPage.saveTextNote('${errorId}')">保存</button>
        <button class="btn btn-ghost" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },

  async saveTextNote(errorId) {
    const text = document.getElementById('note-text-input').value.trim();
    if (!text) { Utils.toast('请输入备注内容'); return; }
    const errors = await DB.getAll('errors');
    const error = errors.find(e => e.id === errorId);
    if (error) {
      error.notes = error.notes || { text: '', voiceText: '', images: [] };
      error.notes.text = (error.notes.text ? error.notes.text + '\n' : '') + text;
      await DB.put('errors', error);
      App.closeModal();
      Utils.toast('✅ 备注已保存');
      this.showDetail(errorId);
    }
  },

  async markMastered(errorId) {
    const errors = await DB.getAll('errors');
    const error = errors.find(e => e.id === errorId);
    if (error) {
      error.mastered = true;
      await DB.put('errors', error);
      Utils.toast('✅ 已标记为掌握');
      this.showDetail(errorId);
    }
  },

  async unmarkMastered(errorId) {
    const errors = await DB.getAll('errors');
    const error = errors.find(e => e.id === errorId);
    if (error) {
      error.mastered = false;
      await DB.put('errors', error);
      Utils.toast('↩️ 已重新标记');
      this.showDetail(errorId);
    }
  },

  async reviewSingle(errorId) {
    const errors = await DB.getAll('errors');
    const questions = await DB.getAll('questions');
    const error = errors.find(e => e.id === errorId);
    const q = questions.find(q => q.id === error.questionId);
    if (q) {
      PracticePage.currentQuestions = [q];
      PracticePage.currentIndex = 0;
      PracticePage.answered = false;
      PracticePage.currentMode = 'normal';
      PracticePage.renderQuestion();
    }
  },

  // 今日推荐复习（智能排序）
  async reviewToday() {
    const errors = await DB.getAll('errors');
    const questions = await DB.getAll('questions');
    const unmastered = errors.filter(e => !e.mastered);

    if (unmastered.length === 0) {
      Utils.toast('🎉 没有需要复习的错题！');
      return;
    }

    // 智能排序：错误次数 * 时间权重
    const scored = unmastered.map(e => {
      const days = this.daysSince(e.lastWrongDate || e.id);
      // 错误次数越多越优先，时间越近越优先
      const score = e.wrongCount * (5 - Math.min(days, 4)) + (days <= 1 ? 10 : 0);
      return { ...e, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 10);

    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <div class="card-title" style="margin-bottom:0;">📋 今日推荐复习（${top.length}题）</div>
        </div>
        <div class="text-secondary" style="font-size:13px;margin-bottom:8px;">
          基于错误次数和最近犯错时间智能排序
        </div>
        <button class="btn btn-primary btn-block" onclick="ErrorBookPage.startReviewList()" id="start-all-review-btn">
          ⚡ 一键复习这${top.length}题
        </button>
      </div>
      ${top.map((e, i) => {
        const q = questions.find(q => q.id === e.questionId);
        return `
          <div class="error-item" style="cursor:pointer;" onclick="ErrorBookPage.showDetail('${e.id}')">
            <div class="error-item-header">
              <div>
                <span style="font-weight:500;">第${i+1}题</span>
                <span class="tag tag-blue">${e.course}</span>
                <span class="tag tag-red">❌ ${e.wrongCount}次</span>
                ${this.daysSince(e.lastWrongDate || e.id) <= 1 ? '<span class="tag tag-orange">新错</span>' : ''}
              </div>
              <button class="btn btn-sm btn-ghost">详情</button>
            </div>
            <div class="error-question-text">
              ${q ? Utils.escapeHtml(q.question.substring(0, 60)) : '题目已删除'}...
            </div>
          </div>
        `;
      }).join('')}
      <button class="btn btn-ghost btn-block mt-8" onclick="App.navigate('error-book')">← 返回错题本</button>
    `;

    // 保存推荐列表用于一键复习
    this.recommendedErrors = top;
  },

  startReviewList() {
    const questions = [];
    for (const e of this.recommendedErrors || []) {
      // 从全局的 questions 里找
    }
    this.startReviewSet();
  },

  // 一键复习所有未掌握错题
  async quickReview() {
    const errors = await DB.getAll('errors');
    const questions = await DB.getAll('questions');
    const unmastered = errors.filter(e => !e.mastered);
    if (unmastered.length === 0) { Utils.toast('没有需要复习的错题'); return; }

    const qs = unmastered.map(e => questions.find(q => q.id === e.questionId)).filter(Boolean);
    if (qs.length === 0) { Utils.toast('没有可练习的题目，请先添加题目'); return; }

    PracticePage.currentQuestions = qs;
    PracticePage.currentIndex = 0;
    PracticePage.answered = false;
    PracticePage.currentMode = 'normal';
    PracticePage.renderQuestion();
  },

  // 生成错题集
  async generateErrorSet() {
    const errors = await DB.getAll('errors');
    const unmastered = errors.filter(e => !e.mastered);
    if (unmastered.length === 0) { Utils.toast('没有错题可以生成错题集'); return; }

    App.showModal(`
      <h3 style="margin-bottom:12px;">📋 生成错题集</h3>
      <div class="input-group">
        <label>选择课程</label>
        <select class="input-field" id="error-set-course">
          <option value="all">全部课程</option>
          ${Utils.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label>排序方式</label>
        <select class="input-field" id="error-set-sort">
          <option value="smart">智能推荐（推荐）</option>
          <option value="count">按错误次数</option>
          <option value="date">按最新犯错时间</option>
        </select>
      </div>
      <div class="input-group">
        <label>题量</label>
        <select class="input-field" id="error-set-count">
          <option value="10">10题</option>
          <option value="20" selected>20题</option>
          <option value="50">50题（全部）</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" onclick="ErrorBookPage.doGenerateErrorSet()">生成</button>
        <button class="btn btn-ghost" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },

  async doGenerateErrorSet() {
    const courseFilter = document.getElementById('error-set-course').value;
    const sortBy = document.getElementById('error-set-sort').value;
    const limit = parseInt(document.getElementById('error-set-count').value);

    let errors = await DB.getAll('errors');
    const questions = await DB.getAll('questions');
    let unmastered = errors.filter(e => !e.mastered);

    if (courseFilter !== 'all') {
      unmastered = unmastered.filter(e => e.course === courseFilter);
    }

    if (unmastered.length === 0) { Utils.toast('没有符合条件的错题'); App.closeModal(); return; }

    if (sortBy === 'smart') {
      unmastered.sort((a, b) => {
        const scoreA = a.wrongCount * (5 - Math.min(this.daysSince(a.lastWrongDate || a.id), 4));
        const scoreB = b.wrongCount * (5 - Math.min(this.daysSince(b.lastWrongDate || b.id), 4));
        return scoreB - scoreA;
      });
    } else if (sortBy === 'count') {
      unmastered.sort((a, b) => b.wrongCount - a.wrongCount);
    } else {
      unmastered.sort((a, b) => b.lastWrongDate.localeCompare(a.lastWrongDate));
    }

    App.closeModal();
    const top = unmastered.slice(0, Math.min(limit, unmastered.length));

    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <div class="card-title" style="margin-bottom:0;">📋 错题集（${top.length}题）</div>
          <button class="btn btn-sm btn-primary" onclick="ErrorBookPage.startReviewSet()">开始练习</button>
        </div>
      </div>
      ${top.map((e, i) => {
        const q = questions.find(q => q.id === e.questionId);
        return `
          <div class="error-item">
            <div style="font-weight:600;margin-bottom:4px;">第${i+1}题</div>
            <span class="tag tag-blue">${e.course}</span>
            <span class="tag tag-red">❌ ${e.wrongCount}次</span>
            <div class="error-question-text mt-8">
              ${q ? Utils.escapeHtml(q.question) : '题目已删除'}
            </div>
            ${q ? `
              <div class="question-options mt-8">
                ${q.options.map((opt, j) => `
                  <div class="option-item ${j === q.answer ? 'correct' : ''}" style="cursor:default;">
                    <div class="option-letter">${Utils.optionLabel(j)}</div>
                    <span>${Utils.escapeHtml(opt.replace(/^[A-D]\.\s*/, ''))}</span>
                  </div>
                `).join('')}
              </div>
              ${q.explanation ? `
                <div class="analysis-panel correct-border mt-8">
                  <div style="font-weight:600;margin-bottom:4px;">解析</div>
                  <div style="font-size:14px;color:var(--text-secondary);">${q.explanation}</div>
                </div>
              ` : ''}
            ` : ''}
          </div>
        `;
      }).join('')}
      <button class="btn btn-ghost btn-block mt-8" onclick="App.navigate('error-book')">← 返回</button>
    `;

    this.reviewSetQuestions = top.map(e => questions.find(q => q.id === e.questionId)).filter(Boolean);
  },

  startReviewSet() {
    if (!this.reviewSetQuestions || this.reviewSetQuestions.length === 0) {
      // 尝试从推荐列表加载
      if (this.recommendedErrors) {
        // 需要从全局问题库找
        this.loadAndStartReview(this.recommendedErrors);
        return;
      }
      Utils.toast('没有可练习的题目');
      return;
    }
    PracticePage.currentQuestions = this.reviewSetQuestions;
    PracticePage.currentIndex = 0;
    PracticePage.answered = false;
    PracticePage.currentMode = 'normal';
    PracticePage.renderQuestion();
  },

  async loadAndStartReview(errorList) {
    const questions = await DB.getAll('questions');
    const qs = errorList.map(e => questions.find(q => q.id === e.questionId)).filter(Boolean);
    if (qs.length === 0) { Utils.toast('没有可练习的题目'); return; }
    PracticePage.currentQuestions = qs;
    PracticePage.currentIndex = 0;
    PracticePage.answered = false;
    PracticePage.currentMode = 'normal';
    PracticePage.renderQuestion();
  },

  viewImage(src) {
    App.showModal(`
      <div style="text-align:center;">
        <img src="${src}" style="max-width:100%;border-radius:8px;">
        <button class="btn btn-ghost mt-8" onclick="App.closeModal()">关闭</button>
      </div>
    `);
  },

  // ===== 错题设置面板 =====
  showSettings() {
    const config = Utils.getLocal('errorSettings', {
      voiceLang: 'zh-CN',
      cameraType: 'environment',
      autoClearImages: false,
      vibration: true
    });

    App.showModal(`
      <h3 style="margin-bottom:16px;">⚙️ 错题设置</h3>

      <div class="input-group">
        <label>🎤 语音识别语言</label>
        <select class="input-field" id="set-voice-lang" onchange="ErrorBookPage.saveSettings()">
          <option value="zh-CN" ${config.voiceLang === 'zh-CN' ? 'selected' : ''}>中文（普通话）</option>
          <option value="zh-CN#cmn-Hans-CN" ${config.voiceLang === 'zh-CN#cmn-Hans-CN' ? 'selected' : ''}>中文（带标点）</option>
          <option value="en-US" ${config.voiceLang === 'en-US' ? 'selected' : ''}>English</option>
        </select>
      </div>

      <div class="input-group">
        <label>📸 拍照摄像头</label>
        <select class="input-field" id="set-camera-type" onchange="ErrorBookPage.saveSettings()">
          <option value="environment" ${config.cameraType === 'environment' ? 'selected' : ''}>后置摄像头（推荐）</option>
          <option value="user" ${config.cameraType === 'user' ? 'selected' : ''}>前置摄像头</option>
        </select>
      </div>

      <div class="input-group" style="display:flex;align-items:center;gap:10px;">
        <input type="checkbox" id="set-auto-clear" ${config.autoClearImages ? 'checked' : ''} onchange="ErrorBookPage.saveSettings()" style="width:18px;height:18px;">
        <label for="set-auto-clear" style="margin-bottom:0;">保存笔记后自动清空图片缓存</label>
      </div>

      <div class="input-group" style="display:flex;align-items:center;gap:10px;">
        <input type="checkbox" id="set-vibration" ${config.vibration !== false ? 'checked' : ''} onchange="ErrorBookPage.saveSettings()" style="width:18px;height:18px;">
        <label for="set-vibration" style="margin-bottom:0;">操作时震动反馈</label>
      </div>

      <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:var(--radius-sm);">
        <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:4px;">💡 使用提示</div>
        <div style="font-size:12px;color:var(--text-light);line-height:1.6;">
          • 语音输入：在错题详情页点 🎤 按钮，说话后自动转文字<br>
          • 拍照记录：点 📸 按钮可拍照或从相册选择图片<br>
          • 图片支持放大查看，可随时清空<br>
          • 语音识别需联网（Chrome/Edge 浏览器支持最好）
        </div>
      </div>

      <button class="btn btn-ghost btn-block mt-8" onclick="App.closeModal()">关闭</button>
    `);
  },

  saveSettings() {
    const config = {
      voiceLang: document.getElementById('set-voice-lang').value,
      cameraType: document.getElementById('set-camera-type').value,
      autoClearImages: document.getElementById('set-auto-clear').checked,
      vibration: document.getElementById('set-vibration').checked
    };
    Utils.setLocal('errorSettings', config);
  },

  // 获取设置
  getConfig() {
    return Utils.getLocal('errorSettings', {
      voiceLang: 'zh-CN',
      cameraType: 'environment',
      autoClearImages: false,
      vibration: true
    });
  }
};
