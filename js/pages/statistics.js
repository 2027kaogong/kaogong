/* ===== 学习统计模块 ===== */
const StatisticsPage = {
  async render(container) {
    const records = await DB.getAll('records');
    const errors = await DB.getAll('errors');
    const checkins = await DB.getAll('checkins');

    const totalQs = records.length;
    const correctQs = records.filter(r => r.isCorrect).length;
    const accuracy = totalQs > 0 ? Math.round(correctQs / totalQs * 100) : 0;
    const unmastered = errors.filter(e => !e.mastered).length;

    // 近7天数据
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayRecords = records.filter(r => r.timestamp && r.timestamp.startsWith(ds));
      const dayCorrect = dayRecords.filter(r => r.isCorrect).length;
      last7.push({
        date: ds,
        total: dayRecords.length,
        correct: dayCorrect,
        rate: dayRecords.length > 0 ? Math.round(dayCorrect / dayRecords.length * 100) : 0
      });
    }

    // 每月打卡天数
    const currentMonth = Utils.today().slice(0, 7);
    const monthCheckins = checkins.filter(c => c.date.startsWith(currentMonth));
    const monthDays = monthCheckins.length;

    container.innerHTML = `
      <div class="card">
        <div class="card-title">📊 学习总览</div>
        <div class="stat-grid">
          <div class="stat-item">
            <div class="stat-number">${totalQs}</div>
            <div class="stat-label">总做题</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" style="color:var(--success);">${accuracy}%</div>
            <div class="stat-label">总正确率</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" style="color:var(--accent);">${unmastered}</div>
            <div class="stat-label">待复习错题</div>
          </div>
        </div>
        <div style="margin-top:8px;text-align:center;color:var(--text-secondary);font-size:13px;">
          本月打卡 ${monthDays} 天
        </div>
      </div>

      <div class="card">
        <div class="card-title">近7天做题趋势</div>
        <div style="display:flex;align-items:flex-end;gap:6px;height:100px;padding:8px 0;">
          ${last7.map((day, i) => {
            const maxTotal = Math.max(...last7.map(d => d.total), 1);
            const height = Math.max(day.total / maxTotal * 80, 4);
            return `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;">
                <div style="font-size:11px;color:var(--text-secondary);margin-bottom:2px;">${day.total}</div>
                <div style="width:100%;background:var(--primary);border-radius:4px 4px 0 0;
                     height:${height}px;opacity:${0.4 + (i === 6 ? 0.4 : 0.2)};">
                </div>
                <div style="font-size:10px;color:var(--text-light);margin-top:4px;">
                  ${['日','一','二','三','四','五','六'][new Date(day.date).getDay()]}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">各课程进度</div>
        ${Utils.courses.map(c => {
          const cr = records.filter(r => r.course === c.id);
          const cc = cr.filter(r => r.isCorrect).length;
          const rate = cr.length > 0 ? Math.round(cc / cr.length * 100) : 0;
          const errCount = errors.filter(e => e.course === c.id && !e.mastered).length;
          return `
            <div style="margin-bottom:12px;">
              <div class="flex-between">
                <span style="font-weight:500;font-size:14px;">${c.icon} ${c.name}</span>
                <span style="font-size:12px;color:var(--text-secondary);">${cr.length}题 | ${rate}% | 错${errCount}</span>
              </div>
              <div class="course-progress" style="margin-top:4px;">
                <div class="course-progress-bar" style="width:${rate}%;${errCount > 0 ? 'background:linear-gradient(90deg,var(--primary),var(--error));' : ''}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card">
        <div class="card-title">今日打卡统计</div>
        <div style="text-align:center;padding:12px 0;">
          <div style="display:flex;justify-content:center;gap:16px;">
            <div>
              <div style="font-size:28px;font-weight:700;color:var(--primary);">${monthDays}</div>
              <div style="font-size:12px;color:var(--text-secondary);">本月打卡天数</div>
            </div>
            <div>
              <div style="font-size:28px;font-weight:700;color:var(--accent);">
                ${monthCheckins.reduce((s, c) => s + (c.studyDuration || 0), 0)}分钟
              </div>
              <div style="font-size:12px;color:var(--text-secondary);">本月学习时长</div>
            </div>
          </div>
          <button class="btn btn-outline btn-sm mt-8" onclick="App.navigate('home')">去打卡 →</button>
        </div>
      </div>
    `;
  }
};
