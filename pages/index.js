Page({
  data: {
    // 比赛状态
    redScore: 0,
    blueScore: 0,
    timeLeft: 180, // 3分钟 = 180秒
    timeLeftDisplay: '03:00',
    isTimerRunning: false,
    timerInterval: null,
    
    // 比赛模式和阶段
    gameMode: '10_points', // '10_points' 或 '3_minutes'
    gamePhase: 'P1', // 'P1', 'P2', 'P3' 或 'P1/2'
    hasPriority: null, // null, 'red', 'blue'
    
    // 处罚系统
    redCards: {
      yellow: 0,
      red: 0,
      black: 0
    },
    blueCards: {
      yellow: 0,
      red: 0,
      black: 0
    }
  },
  
  onLoad(option) {
    this.init();
  },
  
  onShow() {},
  
  async init() {
    this.updateDisplay();
  },
  
  // 更新显示
  updateDisplay() {
    // 更新分数显示
    this.setData({
      timeLeftDisplay: this.formatTime(this.data.timeLeft)
    });
  },
  
  // 格式化时间显示
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  
  // 开始/暂停计时器
  toggleTimer() {
    if (this.data.isTimerRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  },
  
  startTimer() {
    if (this.data.timeLeft <= 0) return;
    
    this.setData({
      isTimerRunning: true
    });
    
    this.data.timerInterval = setInterval(() => {
      const newTime = this.data.timeLeft - 1;
      this.setData({
        timeLeft: newTime,
        timeLeftDisplay: this.formatTime(newTime)
      });
      
      if (newTime <= 0) {
        this.pauseTimer();
        // 比赛结束逻辑
        if (this.data.redScore !== this.data.blueScore) {
          // 如果分数不同，比赛结束
          wx.showToast({
            title: '比赛结束',
            icon: 'none'
          });
        } else {
          // 分数相同，进入优先权模式
          wx.showToast({
            title: '进入优先权模式',
            icon: 'none'
          });
        }
      }
    }, 1000);
  },
  
  pauseTimer() {
    this.setData({
      isTimerRunning: false
    });
    
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.data.timerInterval = null;
    }
  },
  
  // 红方加分
  redScoreAdd() {
    const newScore = this.data.redScore + 1;
    this.setData({
      redScore: newScore
    });
    
    // 检查是否达到胜利分数
    if (this.data.gameMode === '10_points' && newScore >= 10) {
      this.pauseTimer();
      wx.showToast({
        title: '红方获胜',
        icon: 'none'
      });
    }
  },
  
  // 红方减分
  redScoreLose() {
    if (this.data.redScore > 0) {
      this.setData({
        redScore: this.data.redScore - 1
      });
    }
  },
  
  // 蓝方加分
  blueScoreAdd() {
    const newScore = this.data.blueScore + 1;
    this.setData({
      blueScore: newScore
    });
    
    // 检查是否达到胜利分数
    if (this.data.gameMode === '10_points' && newScore >= 10) {
      this.pauseTimer();
      wx.showToast({
        title: '蓝方获胜',
        icon: 'none'
      });
    }
  },
  
  // 蓝方减分
  blueScoreLose() {
    if (this.data.blueScore > 0) {
      this.setData({
        blueScore: this.data.blueScore - 1
      });
    }
  },
  
  // 切换比赛模式
  toggleGameMode() {
    const newMode = this.data.gameMode === '10_points' ? '3_minutes' : '10_points';
    this.setData({
      gameMode: newMode
    });
    
    wx.showToast({
      title: newMode === '10_points' ? '10分制' : '3分钟制',
      icon: 'none'
    });
  },
  
  // 切换比赛阶段
  toggleGamePhase() {
    const phases = ['P1', 'P2', 'P3', 'P1/2'];
    const currentIndex = phases.indexOf(this.data.gamePhase);
    const nextIndex = (currentIndex + 1) % phases.length;
    const newPhase = phases[nextIndex];
    
    this.setData({
      gamePhase: newPhase
    });
    
    wx.showToast({
      title: newPhase,
      icon: 'none'
    });
  },
  
  // 黄牌
  yellowCard(e) {
    const side = e.currentTarget.dataset.side;
    if (side === 'red') {
      const newYc = this.data.redCards.yellow + 1;
      this.setData({
        'redCards.yellow': newYc
      });
    } else {
      const newYc = this.data.blueCards.yellow + 1;
      this.setData({
        'blueCards.yellow': newYc
      });
    }
  },
  
  // 红牌
  redCard(e) {
    const side = e.currentTarget.dataset.side;
    if (side === 'red') {
      const newRc = this.data.redCards.red + 1;
      this.setData({
        'redCards.red': newRc
      });
    } else {
      const newRc = this.data.blueCards.red + 1;
      this.setData({
        'blueCards.red': newRc
      });
    }
  },
  
  // 黑牌
  blackCard(e) {
    const side = e.currentTarget.dataset.side;
    if (side === 'red') {
      const newBc = this.data.redCards.black + 1;
      this.setData({
        'redCards.black': newBc
      });
    } else {
      const newBc = this.data.blueCards.black + 1;
      this.setData({
        'blueCards.black': newBc
      });
    }
  },
  
  // 重置比赛
  resetGame() {
    this.pauseTimer();
    
    this.setData({
      redScore: 0,
      blueScore: 0,
      timeLeft: 180,
      timeLeftDisplay: '03:00',
      hasPriority: null,
      redCards: {
        yellow: 0,
        red: 0,
        black: 0
      },
      blueCards: {
        yellow: 0,
        red: 0,
        black: 0
      }
    });
  },
  
  // 医疗暂停
  medicalPause() {
    this.pauseTimer();
    wx.showModal({
      title: '医疗暂停',
      content: '比赛已暂停，进行医疗处理',
      showCancel: false,
      confirmText: '继续比赛'
    });
  },
  
  // 1分钟休息
  restTime() {
    this.pauseTimer();
    wx.showModal({
      title: '1分钟休息',
      content: '1分钟休息时间',
      showCancel: false,
      confirmText: '继续比赛'
    });
  },
  
  // 优先权
  togglePriority() {
    let newPriority = null;
    if (this.data.hasPriority === null) {
      newPriority = 'red';
    } else if (this.data.hasPriority === 'red') {
      newPriority = 'blue';
    }
    
    this.setData({
      hasPriority: newPriority
    });
    
    wx.showToast({
      title: newPriority ? `${newPriority}方优先权` : '无优先权',
      icon: 'none'
    });
  },

  // setUser 自定义方法
  async setUserFunction(param) {
    let thiz = this.data;
    this.$session.setUser({
      token: '1111',
      username: 'DIY',
      nickname: 'DIYGW可视化',
      //用户角色
      roles: ['role1', 'role2'],
      //用户权限，这里的权限值可以很多个
      permissions: ['user/edit', 'user/del']
    });
    this.userInfo = this.$session.getUser();
  },
  
  // clearUser 自定义方法
  async clearUserFunction(param) {
    let thiz = this.data;
    //清空用户值
    this.$session.clearUser();
    this.userInfo = this.$session.getUser() || {};
  },
  
  // setValue 自定义方法
  async setValueFunction(param) {
    let thiz = this.data;
    this.$session.setUserValue('key', 'value');
  }
});