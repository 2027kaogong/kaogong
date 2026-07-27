/* ===== 首页仪表盘 ===== */
const HomePage = {
  async render(container) {
    const records = await DB.getAll('records');
    const checkins = await DB.getAll('checkins');
    const today = Utils.today();

    // 今日统计
    const todayRecords = records.filter(r => r.timestamp && r.timestamp.startsWith(today));
    const todayTotal = todayRecords.length;
    const todayCorrect = todayRecords.filter(r => r.isCorrect).length;
    const todayRate = todayTotal > 0 ? Math.round(todayCorrect / todayTotal * 100) : 0;

    // 总统计
    const totalQs = records.length;
    const totalCorrect = records.filter(r => r.isCorrect).length;
    const totalRate = totalQs > 0 ? Math.round(totalCorrect / totalQs * 100) : 0;

    // 今日学习时长
    const todayCheckin = checkins.find(c => c.date === today);
    const todayDuration = todayCheckin ? todayCheckin.studyDuration || 0 : 0;

    // 本月打卡
    const currentMonth = today.slice(0, 7);
    const monthCheckins = checkins.filter(c => c.date.startsWith(currentMonth));
    const monthDays = monthCheckins.length;

    // 连续打卡
    let streak = 0;
    let d = new Date();
    while (true) {
      const ds = d.toISOString().slice(0, 10);
      if (checkins.find(c => c.date === ds)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    container.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <div>
            <div style="font-size:14px;color:var(--text-secondary);">${Utils.formatDate(today)}</div>
            <div style="font-size:20px;font-weight:700;margin-top:4px;">今日学习</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:28px;font-weight:700;color:var(--accent);">${streak}</div>
            <div style="font-size:12px;color:var(--text-secondary);">连续打卡</div>
          </div>
        </div>
        <div class="stat-grid" style="margin-top:16px;">
          <div class="stat-item">
            <div class="stat-number">${todayTotal}</div>
            <div class="stat-label">今日做题</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" style="color:var(--success);">${todayRate}%</div>
            <div class="stat-label">今日正确率</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" style="color:var(--accent);">${Utils.formatDuration(todayDuration)}</div>
            <div class="stat-label">今日学习</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">快捷操作</div>
        <div class="quick-actions">
          <div class="action-card" onclick="App.navigate('practice')">
            <div class="action-card-icon">📖</div>
            <div class="action-card-label">开始刷题</div>
          </div>
          <div class="action-card" onclick="App.navigate('plan')">
            <div class="action-card-icon">📝</div>
            <div class="action-card-label">今日计划</div>
          </div>
          <div class="action-card" onclick="ErrorBookPage.reviewToday()">
            <div class="action-card-icon">🔄</div>
            <div class="action-card-label">错题回顾</div>
          </div>
          <div class="action-card" onclick="App.navigate('statistics')">
            <div class="action-card-icon">📊</div>
            <div class="action-card-label">学习统计</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">本月进度</div>
        <div class="flex-between" style="margin-bottom:8px;">
          <span style="font-size:13px;color:var(--text-secondary);">本月打卡 ${monthDays} 天</span>
          <span style="font-size:13px;color:var(--primary);">总做题 ${totalQs} 题 | 正确率 ${totalRate}%</span>
        </div>
        <div class="course-grid">
          ${Utils.courses.map(c => {
            const courseRecords = records.filter(r => r.course === c.id);
            const crt = courseRecords.filter(r => r.isCorrect).length;
            const rate = courseRecords.length > 0 ? Math.round(crt / courseRecords.length * 100) : 0;
            return `
              <div class="course-card" onclick="App.navigate('practice')">
                <div class="course-card-icon">${c.icon}</div>
                <div class="course-card-name">${c.name}</div>
                <div class="course-card-count">${courseRecords.length}题 | ${rate}%</div>
                <div class="course-progress">
                  <div class="course-progress-bar" style="width:${rate}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">晨读推荐</div>
        <div class="text-secondary" style="font-size:14px;line-height:1.6;">
          今天还没晨读？去看看公考隔壁班王老师的最新文章，积累申论素材吧！
        </div>
        <button class="btn btn-primary btn-block mt-8" onclick="App.navigate('morning')">
          去晨读 →
        </button>
      </div>
    `;
  }
};
