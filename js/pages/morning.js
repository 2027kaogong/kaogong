/* ===== 申论晨读模块 ===== */
const MorningPage = {
  async render(container) {
    // 用户手动添加的笔记
    const userEntries = await DB.getAll('morning');
    userEntries.sort((a, b) => b.date.localeCompare(a.date));

    // 自动抓取的内容（公考隔壁班王老师每日更新）
    const autoEntries = (window.MORNING_AUTO_DATA || []).filter(a => {
      // 去重：如果用户已经手动记录过同日的，不重复显示
      return !userEntries.some(u => u.date === a.date && u.title === a.title);
    });

    // 合并显示：自动内容在前，用户笔记在后
    const allEntries = [...autoEntries, ...userEntries];

    container.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <div class="card-title" style="margin-bottom:0;">🌅 申论晨读</div>
          <button class="btn btn-sm btn-primary" onclick="App.navigate('add-morning')">+ 写笔记</button>
        </div>
        <div class="text-secondary" style="font-size:13px;margin-top:4px;">
          公考隔壁班王老师每日更新 · 已收录 ${autoEntries.length} 篇自动推送
        </div>
      </div>

      ${autoEntries.length > 0 ? `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:600;font-size:14px;">🤖 自动推送 · 公考隔壁班王老师</span>
            <a class="btn btn-sm btn-outline" href="https://m.qtfm.cn/vchannels/355522/" target="_blank" rel="noopener">查看全部 →</a>
          </div>
        </div>
      ` : ''}

      ${allEntries.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">🌅</div>
          <div class="empty-state-text">还没有晨读记录</div>
          <div class="text-secondary" style="font-size:14px;margin-bottom:16px;">
            每天自动推送公考隔壁班王老师的申论范文，你也可以手动记录笔记
          </div>
          <button class="btn btn-primary" onclick="App.navigate('add-morning')">写下第一篇笔记</button>
        </div>
      ` : allEntries.map(e => {
        const isAuto = !e.id || e.id.startsWith('auto_');
        return `
          <div class="morning-entry">
            <div class="morning-date">
              📅 ${e.date} 
              ${e.source ? '| ' + e.source : ''}
              ${isAuto ? '<span class="tag tag-blue" style="font-size:10px;">自动推送</span>' : ''}
            </div>
            <div class="morning-title">${Utils.escapeHtml(e.title)}</div>
            <div class="morning-content">${Utils.escapeHtml(e.content)}</div>
            ${e.keywords && e.keywords.length > 0 ? `
              <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">
                ${e.keywords.map(k => `<span class="tag tag-orange">${k}</span>`).join('')}
              </div>
            ` : ''}
            <div style="display:flex;gap:8px;margin-top:8px;">
              ${!isAuto ? `
                <button class="btn btn-sm btn-ghost" onclick="MorningPage.editEntry('${e.id}')">编辑</button>
                <button class="btn btn-sm btn-ghost" onclick="MorningPage.deleteEntry('${e.id}')">删除</button>
              ` : `
                <span style="font-size:12px;color:var(--text-light);">🤖 自动同步自公考隔壁班王老师</span>
              `}
            </div>
          </div>
        `;
      }).join('')}
    `;
  },

  renderAddMorning(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">写晨读笔记</div>
        <div class="input-group">
          <label>标题</label>
          <input class="input-field" id="morning-title" placeholder="例如：乡村振兴专题学习">
        </div>
        <div class="input-group">
          <label>内容 / 金句摘抄 / 感悟</label>
          <textarea class="input-field textarea-field" id="morning-content" placeholder="把今天学到的重要内容记录下来..." style="min-height:200px;"></textarea>
        </div>
        <div class="input-group">
          <label>来源</label>
          <input class="input-field" id="morning-source" placeholder="例如：公考隔壁班王老师 B站">
        </div>
        <div class="input-group">
          <label>标签（用逗号分隔）</label>
          <input class="input-field" id="morning-keywords" placeholder="例如：乡村振兴,金句,对策">
        </div>
        <button class="btn btn-primary btn-block" onclick="MorningPage.saveEntry()">保存笔记</button>
      </div>
    `;
  },

  async saveEntry() {
    const title = document.getElementById('morning-title').value.trim();
    const content = document.getElementById('morning-content').value.trim();
    const source = document.getElementById('morning-source').value.trim();
    const keywordsInput = document.getElementById('morning-keywords').value.trim();

    if (!title || !content) { Utils.toast('请填写标题和内容'); return; }

    const entry = {
      id: 'mrn_' + Utils.uid(),
      date: Utils.today(),
      title: title,
      content: content,
      source: source || '',
      keywords: keywordsInput ? keywordsInput.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
    };

    await DB.add('morning', entry);
    Utils.toast('✅ 晨读笔记已保存');
    App.navigate('morning');
  },

  async editEntry(entryId) {
    const entries = await DB.getAll('morning');
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="card">
        <div class="card-title">编辑晨读笔记</div>
        <div class="input-group">
          <label>标题</label>
          <input class="input-field" id="morning-title" value="${Utils.escapeHtml(entry.title)}">
        </div>
        <div class="input-group">
          <label>内容</label>
          <textarea class="input-field textarea-field" id="morning-content" style="min-height:200px;">${Utils.escapeHtml(entry.content)}</textarea>
        </div>
        <div class="input-group">
          <label>来源</label>
          <input class="input-field" id="morning-source" value="${Utils.escapeHtml(entry.source)}">
        </div>
        <div class="input-group">
          <label>标签</label>
          <input class="input-field" id="morning-keywords" value="${(entry.keywords || []).join(',')}">
        </div>
        <button class="btn btn-primary btn-block" onclick="MorningPage.updateEntry('${entry.id}')">保存修改</button>
      </div>
    `;
  },

  async updateEntry(entryId) {
    const title = document.getElementById('morning-title').value.trim();
    const content = document.getElementById('morning-content').value.trim();
    const source = document.getElementById('morning-source').value.trim();
    const keywordsInput = document.getElementById('morning-keywords').value.trim();
    if (!title || !content) { Utils.toast('请填完整'); return; }

    const entry = {
      id: entryId,
      date: Utils.today(),
      title: title,
      content: content,
      source: source || '',
      keywords: keywordsInput ? keywordsInput.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
    };

    await DB.put('morning', entry);
    Utils.toast('✅ 已更新');
    App.navigate('morning');
  },

  async deleteEntry(entryId) {
    if (!confirm('确定删除这条晨读笔记吗？')) return;
    await DB.delete('morning', entryId);
    Utils.toast('已删除');
    App.navigate('morning');
  }
};
