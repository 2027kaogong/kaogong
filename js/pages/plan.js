/* ===== 学习计划模块 ===== */
const PlanPage = {
  async render(container) {
    const plans = await DB.getAll('plans');
    const today = Utils.today();
    const todayPlan = plans.find(p => p.date === today);
    const weekPlans = plans.filter(p => {
      const diff = (new Date(p.date) - new Date(today)) / 86400000;
      return diff >= -6 && diff <= 0;
    }).sort((a, b) => b.date.localeCompare(a.date));

    container.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <div class="card-title" style="margin-bottom:0;">今日计划</div>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-sm btn-primary" onclick="PlanPage.showAddPlan()">+ 新建</button>
            ${todayPlan ? `<button class="btn btn-sm btn-ghost" onclick="PlanPage.copyPlan('${todayPlan.id}')">复制昨日</button>` : ''}
          </div>
        </div>
      </div>

      ${todayPlan ? `
        <div class="card">
          <div class="flex-between" style="margin-bottom:8px;">
            <span style="font-weight:600;">${todayPlan.title}</span>
            <span style="font-size:12px;color:var(--text-secondary);">
              ${todayPlan.items.filter(i => i.completed).length}/${todayPlan.items.length} 完成
            </span>
          </div>
          ${todayPlan.items.map((item, i) => `
            <div class="plan-item">
              <div class="plan-checkbox ${item.completed ? 'checked' : ''}" 
                   onclick="PlanPage.toggleItem('${todayPlan.id}', ${i})">
                ${item.completed ? '✓' : ''}
              </div>
              <div class="plan-text ${item.completed ? 'completed' : ''}">${Utils.escapeHtml(item.text)}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card">
          <div class="empty-state" style="padding:20px 0;">
            <div class="empty-state-text">今天还没有学习计划</div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;">
              <button class="btn btn-primary" onclick="PlanPage.showAddPlan()">创建今日计划</button>
              <button class="btn btn-outline" onclick="PlanPage.showTemplateSelect()">从模板创建</button>
            </div>
          </div>
        </div>
      `}

      <div class="card">
        <div class="card-title">本周计划概览</div>
        ${weekPlans.length === 0 ? `
          <div class="text-secondary" style="font-size:14px;text-align:center;padding:12px 0;">本周还没有计划记录</div>
        ` : weekPlans.map(p => {
          const done = p.items.filter(i => i.completed).length;
          const total = p.items.length;
          return `
            <div class="list-item" onclick="PlanPage.viewDatePlan('${p.date}')">
              <div>
                <div style="font-weight:500;">${Utils.formatDate(p.date)}</div>
                <div style="font-size:12px;color:var(--text-light);">${p.title}</div>
              </div>
              <div style="margin-left:auto;text-align:right;">
                <span style="font-size:13px;color:${done === total ? 'var(--success)' : 'var(--text-secondary)'}">
                  ${done}/${total}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  async toggleItem(planId, itemIndex) {
    const plans = await DB.getAll('plans');
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    plan.items[itemIndex].completed = !plan.items[itemIndex].completed;
    plan.items[itemIndex].completedAt = plan.items[itemIndex].completed ? new Date().toISOString() : null;
    await DB.put('plans', plan);
    // 如果全完成，增加打卡
    const allDone = plan.items.every(i => i.completed);
    if (allDone) {
      const checkins = await DB.getAll('checkins');
      const existing = checkins.find(c => c.date === plan.date);
      if (existing) {
        existing.questionsDone = (existing.questionsDone || 0) + 10; // 默认加10题
        await DB.put('checkins', existing);
      }
      Utils.toast('🎉 计划全部完成！');
    }
    this.render(document.getElementById('app-content'));
  },

  showAddPlan() {
    App.showModal(`
      <h3 style="margin-bottom:12px;">创建今日计划</h3>
      <div class="input-group">
        <label>计划标题</label>
        <input class="input-field" id="new-plan-title" placeholder="例如：今日学习计划" value="今日学习计划">
      </div>
      <div class="input-group">
        <label>计划项目（每行一个）</label>
        <textarea class="input-field textarea-field" id="new-plan-items" placeholder="言语理解 20题&#10;判断推理 20题&#10;错题复习" style="min-height:120px;"></textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" onclick="PlanPage.savePlan()">保存</button>
        <button class="btn btn-ghost" onclick="PlanPage.showTemplateSelect()">从模板创建</button>
        <button class="btn btn-ghost" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },

  showTemplateSelect() {
    App.showModal(`
      <h3 style="margin-bottom:12px;">选择计划模板</h3>
      ${Utils.planTemplates.map((t, i) => `
        <div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;cursor:pointer;" onclick="PlanPage.useTemplate(${i})">
          <div style="font-weight:500;">${t.name}</div>
          <div style="font-size:13px;color:var(--text-secondary);">${t.items.join('、')}</div>
        </div>
      `).join('')}
      <button class="btn btn-ghost btn-block mt-8" onclick="PlanPage.showAddPlan()">← 自定义创建</button>
    `);
  },

  useTemplate(index) {
    const t = Utils.planTemplates[index];
    App.closeModal();
    App.showModal(`
      <h3 style="margin-bottom:12px;">${t.name}</h3>
      <div class="input-group">
        <label>计划标题</label>
        <input class="input-field" id="new-plan-title" value="${t.name}">
      </div>
      <div class="input-group">
        <label>计划项目（可修改）</label>
        <textarea class="input-field textarea-field" id="new-plan-items" style="min-height:120px;">${t.items.join('\n')}</textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn btn-primary" onclick="PlanPage.savePlan()">保存</button>
        <button class="btn btn-ghost" onclick="PlanPage.showAddPlan()">自定义</button>
        <button class="btn btn-ghost" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },

  async savePlan() {
    const title = document.getElementById('new-plan-title').value.trim();
    const itemsText = document.getElementById('new-plan-items').value.trim();
    if (!title || !itemsText) { Utils.toast('请填写完整'); return; }

    const items = itemsText.split('\n').filter(s => s.trim()).map(s => ({
      text: s.trim(),
      completed: false,
      completedAt: null
    }));

    const plan = {
      id: 'plan_' + Utils.uid(),
      date: Utils.today(),
      title: title,
      items: items,
      template: ''
    };

    await DB.add('plans', plan);
    App.closeModal();
    Utils.toast('✅ 计划已创建');
    this.render(document.getElementById('app-content'));
  },

  async copyPlan(planId) {
    const plans = await DB.getAll('plans');
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const newPlan = {
      id: 'plan_' + Utils.uid(),
      date: Utils.today(),
      title: plan.title,
      items: plan.items.map(i => ({ text: i.text, completed: false, completedAt: null })),
      template: plan.template
    };

    await DB.add('plans', newPlan);
    Utils.toast('✅ 已复制昨日计划');
    this.render(document.getElementById('app-content'));
  },

  async viewDatePlan(dateStr) {
    const plans = await DB.getAll('plans');
    const plan = plans.find(p => p.date === dateStr);
    if (!plan) return;

    App.showModal(`
      <h3 style="margin-bottom:12px;">${Utils.formatDate(dateStr)} 计划</h3>
      <div style="font-weight:500;margin-bottom:8px;">${plan.title}</div>
      ${plan.items.map((item, i) => `
        <div class="plan-item">
          <div class="plan-checkbox ${item.completed ? 'checked' : ''}">
            ${item.completed ? '✓' : ''}
          </div>
          <div class="plan-text ${item.completed ? 'completed' : ''}">${Utils.escapeHtml(item.text)}</div>
        </div>
      `).join('')}
      <button class="btn btn-ghost btn-block mt-8" onclick="App.closeModal()">关闭</button>
    `);
  },

  // 公共方法 - 供其他模块调用
  renderAddPlan(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title">创建学习计划</div>
        <div class="input-group">
          <label>计划标题</label>
          <input class="input-field" id="new-plan-title" placeholder="例如：今日学习计划" value="今日学习计划">
        </div>
        <div class="input-group">
          <label>计划项目（每行一个）</label>
          <textarea class="input-field textarea-field" id="new-plan-items" placeholder="每行写一项计划&#10;例如：&#10;言语理解 20题&#10;判断推理 20题&#10;错题复习" style="min-height:150px;"></textarea>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:8px;">快速使用模板</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${Utils.planTemplates.map((t, i) => `
              <span class="filter-chip" onclick="PlanPage.fillTemplate(${i})">${t.name}</span>
            `).join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="PlanPage.savePlanFromPage()">保存计划</button>
      </div>
    `;
  },

  fillTemplate(index) {
    const t = Utils.planTemplates[index];
    document.getElementById('new-plan-title').value = t.name;
    document.getElementById('new-plan-items').value = t.items.join('\n');
  },

  async savePlanFromPage() {
    const title = document.getElementById('new-plan-title').value.trim();
    const itemsText = document.getElementById('new-plan-items').value.trim();
    if (!title || !itemsText) { Utils.toast('请填写完整'); return; }

    const items = itemsText.split('\n').filter(s => s.trim()).map(s => ({
      text: s.trim(),
      completed: false,
      completedAt: null
    }));

    const plan = {
      id: 'plan_' + Utils.uid(),
      date: Utils.today(),
      title: title,
      items: items,
      template: ''
    };

    await DB.add('plans', plan);
    Utils.toast('✅ 计划已创建');
    App.navigate('plan');
  }
};
