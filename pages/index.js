Page({
  data: {
    // 比赛状态
    redScore: 0,
    greenScore: 0,
    timeLeft: 180, // 3分钟 = 180秒
    timeLeftDisplay: '03:00',
    isTimerRunning: false,
    timerInterval: null,
    
    // 比赛模式和阶段
    gameMode: '10_points', // '10_points' 或 '3_minutes'
    gamePhase: 'P1', // 'P1', 'P2', 'P3' 或 'P1/2'
    hasPriority: null, // null, 'red', 'green'
    
    // 处罚系统
    redCards: {
      yellow: 0,
      red: 0,
      black: 0
    },
    greenCards: {
      yellow: 0,
      red: 0,
      black: 0
    }
  },
  
  onLoad(option) {
    this.init();
    this.initBluetoothAdapter();  // 页面加载时初始化蓝牙适配器
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
        if (this.data.redScore !== this.data.greenScore) {
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
  greenScoreAdd() {
    const newScore = this.data.greenScore + 1;
    this.setData({
      greenScore: newScore
    });
    
    // 检查是否达到胜利分数
    if (this.data.gameMode === '10_points' && newScore >= 10) {
      this.pauseTimer();
      wx.showToast({
        title: '绿方获胜',
        icon: 'none'
      });
    }
  },
  
  // 蓝方减分
  greenScoreLose() {
    if (this.data.greenScore > 0) {
      this.setData({
        greenScore: this.data.greenScore - 1
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
      const newYc = this.data.greenCards.yellow + 1;
      this.setData({
        'greenCards.yellow': newYc
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
      const newRc = this.data.greenCards.red + 1;
      this.setData({
        'greenCards.red': newRc
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
      const newBc = this.data.greenCards.black + 1;
      this.setData({
        'greenCards.black': newBc
      });
    }
  },

  // 重置比赛
  resetGame() {
    this.pauseTimer();
    
    this.setData({
      redScore: 0,
      greenScore: 0,
      timeLeft: 180,
      timeLeftDisplay: '03:00',
      hasPriority: null,
      redCards: {
        yellow: 0,
        red: 0,
        black: 0
      },
      greenCards: {
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
      newPriority = 'green';
    }
    
    this.setData({
      hasPriority: newPriority
    });
    
    wx.showToast({
      title: newPriority ? `${newPriority}方优先权` : '无优先权',
      icon: 'none'
    });
  },

  // 初始化蓝牙适配器
  initBluetoothAdapter() {
    const thiz = this;
    wx.openBluetoothAdapter({
      success: function(res) {
        console.log('蓝牙适配器初始化成功', res);
        wx.showToast({
          title: '蓝牙适配器初始化成功',
          icon: 'success'
        });
      },
      fail: function(err) {
        console.log('蓝牙适配器初始化失败', err);
        wx.showToast({
          title: '蓝牙适配器初始化失败',
          icon: 'error'
        });
      }
    });
  },

  // 弹出红方图标确认窗口
  showRedIconModal() {
    wx.showModal({
      title: '确认操作',
      content: '是否连接红方蓝牙设备？',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          console.log('用户点击了确认');
          this.searchAndConnectToDevice('fencing_sword_red', 'red');
        } else if (res.cancel) {
          console.log('用户点击了取消');
        }
      }
    });
  },

  // 搜索并连接到指定设备
  searchAndConnectToDevice(deviceName, side) {
    const thiz = this;
    
    // 开始搜索蓝牙设备
    wx.startBluetoothDevicesDiscovery({
      success: function(res) {
        console.log('开始搜索蓝牙设备');
        
        // 监听搜索到新设备的事件
        wx.onBluetoothDeviceFound(function(res) {
          const devices = res.devices;
          for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            if (device.name === deviceName || device.localName === deviceName) {
              console.log(`找到设备 ${deviceName}:`, device);
              
              // 停止搜索
              wx.stopBluetoothDevicesDiscovery({
                complete: function() {
                  console.log('停止搜索');
                  
                  // 连接设备
                  wx.createBLEConnection({
                    deviceId: device.deviceId,
                    success: function(res) {
                      console.log(`${deviceName} 连接成功`, res);
                      
                      // 更新连接状态
                      if (side === 'red') {
                        thiz.setData({
                          redDeviceConnected: true
                        });
                      } else if (side === 'green') {
                        thiz.setData({
                          greenDeviceConnected: true
                        });
                      }
                      
                      wx.showToast({
                        title: `${deviceName} 连接成功`,
                        icon: 'success'
                      });
                    },
                    fail: function(err) {
                      console.log(`${deviceName} 连接失败`, err);
                      wx.showToast({
                        title: `${deviceName} 连接失败`,
                        icon: 'error'
                      });
                    }
                  });
                }
              });
            }
          }
        });
      },
      fail: function(err) {
        console.log('搜索蓝牙设备失败', err);
        wx.showToast({
          title: '搜索蓝牙设备失败',
          icon: 'error'
        });
      }
    });
  },

  // 弹出绿方图标确认窗口
  showGreenIconModal() {
    wx.showModal({
      title: '确认操作',
      content: '您点击了绿方图标，将搜索蓝牙设备fencing_sword_green',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          console.log('用户点击了确认');
          this.searchAndConnectToDevice('fencing_sword_green', 'green');
        } else if (res.cancel) {
          console.log('用户点击了取消');
        }
      }
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