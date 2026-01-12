Page({
  data: {
    // 比赛状态 【完全保留你的原有配置】
    redScore: 0,
    greenScore: 0,
    timeLeft: 180, // 3分钟 = 180秒
    timeLeftDisplay: '03:00',
    isTimerRunning: false,
    timerInterval: null,
    lastHitTimestamp: null,  // 互中检测-最近击中时间戳
    lastHitSide: null,       // 互中检测-最近击中方
    
    // 比赛模式和阶段 【完全保留】
    gameMode: '10_points', // '10_points' 或 '3_minutes'
    gamePhase: 'P1', // 'P1', 'P2', 'P3' 或 'P1/2'
    hasPriority: null, // null, 'red', 'green'
    
    // 处罚系统 【完全保留】
    redCards: { yellow: 0, red: 0, black: 0 },
    greenCards: { yellow: 0, red: 0, black: 0 },
    
    // 蓝牙连接状态 【仅做展示】
    redDeviceConnected: false,
    greenDeviceConnected: false,
    
    // 击中信号记录 【完全保留】
    hitSignals: []
  },

  // ===================== 通用蓝牙常量定义 =====================
  BLE_CONST: {
    SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
    CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    SEARCH_TIMEOUT: 10000, // 搜索超时时间 10秒
    CONNECT_TIMEOUT: 3000  // 连接超时时间 3秒
  },

  // ✅ 红方独立蓝牙对象 + 超详细日志
  redBle: {
    deviceId: null,
    isConnected: false,
    discoveryTimer: null,
    bleConst: null,
    page: null,
    init(page, bleConst) {
      this.page = page;
      this.bleConst = bleConst;
      this.deviceId = null;
      this.isConnected = false;
      console.log('🔴【红方蓝牙】初始化完成，配置参数已注入');
    },
    // 红方-搜索并连接
    searchAndConnect() {
      const _this = this;
      console.log('🔴【红方蓝牙】开始执行搜索连接流程');
      // 先停止上一次搜索
      wx.stopBluetoothDevicesDiscovery({ 
        complete: () => {
          console.log('🔴【红方蓝牙】前置操作：停止上一次蓝牙搜索(防冲突)');
        } 
      });
      // 清除旧的超时器
      if(_this.discoveryTimer){
        clearTimeout(_this.discoveryTimer);
        console.log('🔴【红方蓝牙】前置操作：清除旧的搜索超时计时器');
      }
      // 移除旧的设备监听
      wx.offBluetoothDeviceFound();
      console.log('🔴【红方蓝牙】前置操作：移除旧的蓝牙设备发现监听');
      
      wx.showLoading({ title: '搜索红方设备中', mask: true });
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: (res) => {
          console.log('✅🔴【红方蓝牙】蓝牙搜索已启动，搜索参数：', res);
          // 搜索超时兜底
          _this.discoveryTimer = setTimeout(() => {
            wx.stopBluetoothDevicesDiscovery({ complete: () => {} });
            wx.hideLoading();
            console.error('❌🔴【红方蓝牙】搜索超时 >> 10秒内未找到目标设备 epee_red');
            wx.showToast({ title: '红方设备搜索超时', icon: 'error' });
          }, _this.bleConst.SEARCH_TIMEOUT);

          // 监听设备发现事件
          wx.onBluetoothDeviceFound((res) => {
            console.log('ℹ️🔴【红方蓝牙】监听到新的蓝牙设备，设备列表：', res.devices);
            res.devices.forEach(device => {
              // 过滤无名称设备
              if (!device.name && !device.localName) {
                console.log('ℹ️🔴【红方蓝牙】过滤无名蓝牙设备，设备ID：', device.deviceId);
                return;
              }
              // 匹配目标设备
              if (device.name === 'epee_red' || device.localName === 'epee_red') {
                console.log('✅🔴【红方蓝牙】找到目标设备 >> 名称：%s，设备ID：%s，设备信息：', device.name || device.localName, device.deviceId, device);
                // 停止搜索+关闭加载+清除超时
                wx.stopBluetoothDevicesDiscovery({ 
                  complete: () => {
                    console.log('🔴【红方蓝牙】找到目标设备，已主动停止蓝牙搜索');
                  }
                });
                wx.hideLoading();
                clearTimeout(_this.discoveryTimer);
                // 发起设备连接
                _this.connect(device.deviceId);
              } else {
                console.log('ℹ️🔴【红方蓝牙】发现非目标设备，设备名：%s，跳过匹配', device.name || device.localName);
              }
            });
          });
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('❌🔴【红方蓝牙】蓝牙搜索启动失败 >> ', err);
          wx.showToast({ title: '红方搜索失败', icon: 'error' });
        }
      });
    },
    // 红方-连接设备核心方法
    connect(deviceId) {
      const _this = this;
      // 检查是否已连接
      if (_this.isConnected && _this.deviceId === deviceId) {
        console.log('ℹ️🔴【红方蓝牙】无需重复连接 >> 设备已处于连接状态，设备ID：', deviceId);
        wx.showToast({ title: '红方已连接', icon: 'success' });
        return;
      }
      console.log('ℹ️🔴【红方蓝牙】开始发起BLE连接 >> 目标设备ID：', deviceId);
      wx.createBLEConnection({
        deviceId,
        timeout: _this.bleConst.CONNECT_TIMEOUT,
        success: (res) => {
          console.log('✅🔴【红方蓝牙】BLE连接成功 >> 设备ID：%s，连接结果：', deviceId, res);
          _this.deviceId = deviceId;
          _this.isConnected = true;
          _this.page.setData({ redDeviceConnected: true });
          wx.showToast({ title: '红方连接成功', icon: 'success' });
          // 初始化服务和特征值
          _this.initService();
        },
        fail: (err) => {
          console.error('❌🔴【红方蓝牙】BLE连接失败 >> 设备ID：%s，错误信息：', deviceId, err);
          wx.showToast({ title: '红方连接失败', icon: 'error' });
        }
      });
    },
    // 红方-初始化服务+特征值+数据监听
    initService() {
      const _this = this;
      console.log('ℹ️🔴【红方蓝牙】开始初始化BLE服务 >> 设备ID：%s，目标服务UUID：%s', _this.deviceId, _this.bleConst.SERVICE_UUID);
      // 移除旧的特征值监听，防止串流
      wx.offBLECharacteristicValueChange();
      console.log('🔴【红方蓝牙】移除旧的特征值变化监听，保证监听独立');
      wx.getBLEDeviceServices({
        deviceId: _this.deviceId,
        success: (res) => {
          console.log('✅🔴【红方蓝牙】获取设备服务成功 >> 服务列表：', res.services);
          wx.getBLEDeviceCharacteristics({
            deviceId: _this.deviceId,
            serviceId: _this.bleConst.SERVICE_UUID,
            success: (res) => {
              console.log('✅🔴【红方蓝牙】获取特征值成功 >> 特征值列表：', res.characteristics);
              // 开启特征值通知
              wx.notifyBLECharacteristicValueChange({
                deviceId: _this.deviceId,
                serviceId: _this.bleConst.SERVICE_UUID,
                characteristicId: _this.bleConst.CHARACTERISTIC_UUID,
                state: true,
                success: (res) => {
                  console.log('✅🔴【红方蓝牙】特征值通知已开启 >> 可以接收击中数据，通知状态：', res);
                  // 绑定专属数据监听
                  wx.onBLECharacteristicValueChange((res) => {
                    console.log('ℹ️🔴【红方蓝牙】监听到特征值数据变化 >> 原始二进制数据：', res.value);
                    const data = _this.page.ab2str(res.value);
                    console.log('ℹ️🔴【红方蓝牙】解析后的数据内容：', data);
                    _this.page.parseHitSignal(data, 'red');
                  });
                },
                fail: (err) => {
                  console.error('❌🔴【红方蓝牙】开启特征值通知失败 >> ', err);
                }
              });
            },
            fail: (err) => {
              console.error('❌🔴【红方蓝牙】获取特征值失败 >> ', err);
            }
          });
        },
        fail: (err) => {
          console.error('❌🔴【红方蓝牙】获取设备服务失败 >> ', err);
        }
      });
    },
    // 红方-断开连接
    disconnect() {
      const _this = this;
      if (_this.isConnected && _this.deviceId) {
        console.log('ℹ️🔴【红方蓝牙】开始执行断开连接操作 >> 设备ID：', _this.deviceId);
        wx.closeBLEConnection({
          deviceId: _this.deviceId,
          success: (res) => {
            console.log('✅🔴【红方蓝牙】断开连接成功 >> ', res);
          },
          fail: (err) => {
            console.error('❌🔴【红方蓝牙】断开连接失败 >> ', err);
          },
          complete: () => {
            _this.isConnected = false;
            _this.deviceId = null;
            _this.page.setData({ redDeviceConnected: false });
            console.log('🔴【红方蓝牙】断开连接完成，重置设备状态');
          }
        });
      } else {
        console.log('ℹ️🔴【红方蓝牙】无需断开 >> 设备未处于连接状态');
      }
    }
  },

  // ✅ 绿方独立蓝牙对象 + 超详细日志
  greenBle: {
    deviceId: null,
    isConnected: false,
    discoveryTimer: null,
    bleConst: null,
    page: null,
    init(page, bleConst) {
      this.page = page;
      this.bleConst = bleConst;
      this.deviceId = null;
      this.isConnected = false;
      console.log('🟢【绿方蓝牙】初始化完成，配置参数已注入');
    },
    // 绿方-搜索并连接
    searchAndConnect() {
      const _this = this;
      console.log('🟢【绿方蓝牙】开始执行搜索连接流程');
      // 先停止上一次搜索
      wx.stopBluetoothDevicesDiscovery({ 
        complete: () => {
          console.log('🟢【绿方蓝牙】前置操作：停止上一次蓝牙搜索(防冲突)');
        } 
      });
      // 清除旧的超时器
      if(_this.discoveryTimer){
        clearTimeout(_this.discoveryTimer);
        console.log('🟢【绿方蓝牙】前置操作：清除旧的搜索超时计时器');
      }
      // 移除旧的设备监听
      wx.offBluetoothDeviceFound();
      console.log('🟢【绿方蓝牙】前置操作：移除旧的蓝牙设备发现监听');
      
      wx.showLoading({ title: '搜索绿方设备中', mask: true });
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: (res) => {
          console.log('✅🟢【绿方蓝牙】蓝牙搜索已启动，搜索参数：', res);
          // 搜索超时兜底
          _this.discoveryTimer = setTimeout(() => {
            wx.stopBluetoothDevicesDiscovery({ complete: () => {} });
            wx.hideLoading();
            console.error('❌🟢【绿方蓝牙】搜索超时 >> 10秒内未找到目标设备 epee_green');
            wx.showToast({ title: '绿方设备搜索超时', icon: 'error' });
          }, _this.bleConst.SEARCH_TIMEOUT);

          // 监听设备发现事件
          wx.onBluetoothDeviceFound((res) => {
            console.log('ℹ️🟢【绿方蓝牙】监听到新的蓝牙设备，设备列表：', res.devices);
            res.devices.forEach(device => {
              // 过滤无名称设备
              if (!device.name && !device.localName) {
                console.log('ℹ️🟢【绿方蓝牙】过滤无名蓝牙设备，设备ID：', device.deviceId);
                return;
              }
              // 匹配目标设备
              if (device.name === 'epee_green' || device.localName === 'epee_green') {
                console.log('✅🟢【绿方蓝牙】找到目标设备 >> 名称：%s，设备ID：%s，设备信息：', device.name || device.localName, device.deviceId, device);
                // 停止搜索+关闭加载+清除超时
                wx.stopBluetoothDevicesDiscovery({ 
                  complete: () => {
                    console.log('🟢【绿方蓝牙】找到目标设备，已主动停止蓝牙搜索');
                  }
                });
                wx.hideLoading();
                clearTimeout(_this.discoveryTimer);
                // 发起设备连接
                _this.connect(device.deviceId);
              } else {
                console.log('ℹ️🟢【绿方蓝牙】发现非目标设备，设备名：%s，跳过匹配', device.name || device.localName);
              }
            });
          });
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('❌🟢【绿方蓝牙】蓝牙搜索启动失败 >> ', err);
          wx.showToast({ title: '绿方搜索失败', icon: 'error' });
        }
      });
    },
    // 绿方-连接设备核心方法
    connect(deviceId) {
      const _this = this;
      // 检查是否已连接
      if (_this.isConnected && _this.deviceId === deviceId) {
        console.log('ℹ️🟢【绿方蓝牙】无需重复连接 >> 设备已处于连接状态，设备ID：', deviceId);
        wx.showToast({ title: '绿方已连接', icon: 'success' });
        return;
      }
      console.log('ℹ️🟢【绿方蓝牙】开始发起BLE连接 >> 目标设备ID：', deviceId);
      wx.createBLEConnection({
        deviceId,
        timeout: _this.bleConst.CONNECT_TIMEOUT,
        success: (res) => {
          console.log('✅🟢【绿方蓝牙】BLE连接成功 >> 设备ID：%s，连接结果：', deviceId, res);
          _this.deviceId = deviceId;
          _this.isConnected = true;
          _this.page.setData({ greenDeviceConnected: true });
          wx.showToast({ title: '绿方连接成功', icon: 'success' });
          // 初始化服务和特征值
          _this.initService();
        },
        fail: (err) => {
          console.error('❌🟢【绿方蓝牙】BLE连接失败 >> 设备ID：%s，错误信息：', deviceId, err);
          wx.showToast({ title: '绿方连接失败', icon: 'error' });
        }
      });
    },
    // 绿方-初始化服务+特征值+数据监听
    initService() {
      const _this = this;
      console.log('ℹ️🟢【绿方蓝牙】开始初始化BLE服务 >> 设备ID：%s，目标服务UUID：%s', _this.deviceId, _this.bleConst.SERVICE_UUID);
      // 移除旧的特征值监听，防止串流
      wx.offBLECharacteristicValueChange();
      console.log('🟢【绿方蓝牙】移除旧的特征值变化监听，保证监听独立');
      wx.getBLEDeviceServices({
        deviceId: _this.deviceId,
        success: (res) => {
          console.log('✅🟢【绿方蓝牙】获取设备服务成功 >> 服务列表：', res.services);
          wx.getBLEDeviceCharacteristics({
            deviceId: _this.deviceId,
            serviceId: _this.bleConst.SERVICE_UUID,
            success: (res) => {
              console.log('✅🟢【绿方蓝牙】获取特征值成功 >> 特征值列表：', res.characteristics);
              // 开启特征值通知
              wx.notifyBLECharacteristicValueChange({
                deviceId: _this.deviceId,
                serviceId: _this.bleConst.SERVICE_UUID,
                characteristicId: _this.bleConst.CHARACTERISTIC_UUID,
                state: true,
                success: (res) => {
                  console.log('✅🟢【绿方蓝牙】特征值通知已开启 >> 可以接收击中数据，通知状态：', res);
                  // 绑定专属数据监听
                  wx.onBLECharacteristicValueChange((res) => {
                    console.log('ℹ️🟢【绿方蓝牙】监听到特征值数据变化 >> 原始二进制数据：', res.value);
                    const data = _this.page.ab2str(res.value);
                    console.log('ℹ️🟢【绿方蓝牙】解析后的数据内容：', data);
                    _this.page.parseHitSignal(data, 'green');
                  });
                },
                fail: (err) => {
                  console.error('❌🟢【绿方蓝牙】开启特征值通知失败 >> ', err);
                }
              });
            },
            fail: (err) => {
              console.error('❌🟢【绿方蓝牙】获取特征值失败 >> ', err);
            }
          });
        },
        fail: (err) => {
          console.error('❌🟢【绿方蓝牙】获取设备服务失败 >> ', err);
        }
      });
    },
    // 绿方-断开连接
    disconnect() {
      const _this = this;
      if (_this.isConnected && _this.deviceId) {
        console.log('ℹ️🟢【绿方蓝牙】开始执行断开连接操作 >> 设备ID：', _this.deviceId);
        wx.closeBLEConnection({
          deviceId: _this.deviceId,
          success: (res) => {
            console.log('✅🟢【绿方蓝牙】断开连接成功 >> ', res);
          },
          fail: (err) => {
            console.error('❌🟢【绿方蓝牙】断开连接失败 >> ', err);
          },
          complete: () => {
            _this.isConnected = false;
            _this.deviceId = null;
            _this.page.setData({ greenDeviceConnected: false });
            console.log('🟢【绿方蓝牙】断开连接完成，重置设备状态');
          }
        });
      } else {
        console.log('ℹ️🟢【绿方蓝牙】无需断开 >> 设备未处于连接状态');
      }
    }
  },

  // ===================== 页面生命周期 & 原有业务逻辑（完全保留） =====================
  onLoad(option) {
    this.init();
    this.initBluetoothAdapter();
    // 初始化两个独立蓝牙对象
    this.redBle.init(this, this.BLE_CONST);
    this.greenBle.init(this, this.BLE_CONST);
  },
  
  async init() {
    this.updateDisplay();
  },
  
  updateDisplay() {
    this.setData({ timeLeftDisplay: this.formatTime(this.data.timeLeft) });
  },
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  
  toggleTimer() {
    this.data.isTimerRunning ? this.pauseTimer() : this.startTimer();
  },
  
  startTimer() {
    if (this.data.timeLeft <= 0) return;
    this.setData({ isTimerRunning: true });
    this.data.timerInterval = setInterval(() => {
      const newTime = this.data.timeLeft - 1;
      this.setData({ timeLeft: newTime, timeLeftDisplay: this.formatTime(newTime) });
      if (newTime <= 0) {
        this.pauseTimer();
        this.data.redScore !== this.data.greenScore 
          ? wx.showToast({ title: '比赛结束', icon: 'none' })
          : wx.showToast({ title: '进入优先权模式', icon: 'none' });
      }
    }, 1000);
  },
  
  pauseTimer() {
    this.setData({ isTimerRunning: false });
    this.data.timerInterval && clearInterval(this.data.timerInterval);
    this.data.timerInterval = null;
  },

  // 分数操作
  redScoreAdd() {
    const newScore = this.data.redScore + 1;
    this.setData({ redScore: newScore });
    this.data.gameMode === '10_points' && newScore >=10 && (this.pauseTimer(), wx.showToast({ title: '红方获胜', icon: 'none' }));
  },
  redScoreLose() { this.data.redScore>0 && this.setData({ redScore: this.data.redScore-1 }); },
  greenScoreAdd() {
    const newScore = this.data.greenScore + 1;
    this.setData({ greenScore: newScore });
    this.data.gameMode === '10_points' && newScore >=10 && (this.pauseTimer(), wx.showToast({ title: '绿方获胜', icon: 'none' }));
  },
  greenScoreLose() { this.data.greenScore>0 && this.setData({ greenScore: this.data.greenScore-1 }); },

  // 比赛模式/阶段切换
  toggleGameMode() {
    const newMode = this.data.gameMode === '10_points' ? '3_minutes' : '10_points';
    this.setData({ gameMode: newMode });
    wx.showToast({ title: newMode === '10_points' ? '10分制' : '3分钟制', icon: 'none' });
  },
  toggleGamePhase() {
    const phases = ['P1','P2','P3','P1/2'];
    const newPhase = phases[(phases.indexOf(this.data.gamePhase)+1)%4];
    this.setData({ gamePhase: newPhase });
    wx.showToast({ title: newPhase, icon: 'none' });
  },

  // 处罚卡牌
  yellowCard(e) { this.setData({ [`${e.currentTarget.dataset.side}Cards.yellow`]: this.data[`${e.currentTarget.dataset.side}Cards`].yellow+1 }); },
  redCard(e) { this.setData({ [`${e.currentTarget.dataset.side}Cards.red`]: this.data[`${e.currentTarget.dataset.side}Cards`].red+1 }); },
  blackCard(e) { this.setData({ [`${e.currentTarget.dataset.side}Cards.black`]: this.data[`${e.currentTarget.dataset.side}Cards`].black+1 }); },

  // 比赛重置/暂停/优先权
  resetGame() {
    this.pauseTimer();
    this.setData({
      redScore:0, greenScore:0, timeLeft:180, timeLeftDisplay:'03:00',
      hasPriority:null, lastHitTimestamp:null, lastHitSide:null,
      redCards:{yellow:0,red:0,black:0}, greenCards:{yellow:0,red:0,black:0}
    });
  },
  medicalPause() { this.pauseTimer(); wx.showModal({ title:'医疗暂停', content:'比赛已暂停，进行医疗处理', showCancel:false, confirmText:'继续比赛' }); },
  restTime() { this.pauseTimer(); wx.showModal({ title:'1分钟休息', content:'1分钟休息时间', showCancel:false, confirmText:'继续比赛' }); },
  togglePriority() {
    let newPriority = this.data.hasPriority === null ? 'red' : this.data.hasPriority === 'red' ? 'green' : null;
    this.setData({ hasPriority: newPriority });
    wx.showToast({ title: newPriority ? `${newPriority}方优先权` : '无优先权', icon: 'none' });
  },

  // ===================== 蓝牙基础初始化 + 点击事件 【加日志】=====================
  initBluetoothAdapter() {
    console.log('📶【全局蓝牙】开始初始化微信蓝牙适配器');
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('✅📶【全局蓝牙】蓝牙适配器初始化成功 >> ', res);
        wx.showToast({ title: '蓝牙适配器就绪', icon: 'success' });
      },
      fail: (err) => {
        console.error('❌📶【全局蓝牙】蓝牙适配器初始化失败 >> ', err);
        wx.showToast({ title: '请打开手机蓝牙', icon: 'error' });
      }
    });
  },

  // 红方连接弹窗
  showRedIconModal() {
    wx.showModal({
      title: '确认连接', content: '是否连接【红方】蓝牙设备？',
      confirmText: '确认', cancelText: '取消',
      success: (res) => {
        if(res.confirm){
          console.log('🔴【红方蓝牙】用户确认发起连接');
          this.redBle.searchAndConnect();
        } else {
          console.log('🔴【红方蓝牙】用户取消连接操作');
        }
      }
    });
  },

  // 绿方连接弹窗
  showGreenIconModal() {
    wx.showModal({
      title: '确认连接', content: '是否连接【绿方】蓝牙设备？',
      confirmText: '确认', cancelText: '取消',
      success: (res) => {
        if(res.confirm){
          console.log('🟢【绿方蓝牙】用户确认发起连接');
          this.greenBle.searchAndConnect();
        } else {
          console.log('🟢【绿方蓝牙】用户取消连接操作');
        }
      }
    });
  },

  // ===================== 通用工具方法 【加日志】=====================
  ab2str(buffer) {
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
    return result;
  },

  // 击中信号解析（原逻辑不变 + 日志）
  parseHitSignal(data, side) {
    console.log(`🎯【${side === 'red' ? '红方':'绿方'}击中】开始解析击中信号，原始数据：`, data);
    const regex = /time:(\d+)\|(\w+):(\d+)/;
    const match = data.match(regex);
    if (!match) {
      console.error(`❌🎯【${side === 'red' ? '红方':'绿方'}击中】数据格式不匹配，解析失败`);
      return;
    }

    const newHitSignal = {
      time: match[1], color: match[2], score:1, side, timestamp: Date.now()
    };
    this.setData({ hitSignals: [...this.data.hitSignals, newHitSignal] });
    console.log(`✅🎯【${side === 'red' ? '红方':'绿方'}击中】信号解析成功，解析结果：`, newHitSignal);

    // 互中判定逻辑
    const currentTimestamp = Date.now();
    let isDoubleTouch = false;
    if (this.data.lastHitTimestamp && this.data.lastHitSide && this.data.lastHitSide !== side && (currentTimestamp - this.data.lastHitTimestamp) <= 50) {
      isDoubleTouch = true;
      console.log('⚔️【互中判定】检测到双方50ms内互中，判定有效！');
    }
    this.setData({ lastHitTimestamp: currentTimestamp, lastHitSide: side });

    // 加分逻辑
    if (isDoubleTouch) {
      this.setData({ redScore: this.data.redScore+1, greenScore: this.data.greenScore+1 });
      wx.showToast({ title: '双方互中，各加1分', icon: 'none' });
      console.log('⚔️【计分更新】互中加分完成，红方：%s，绿方：%s', this.data.redScore+1, this.data.greenScore+1);
    } else {
      if (side === 'red' && match[2] === 'RED') {
        this.setData({ redScore: this.data.redScore+1 });
        wx.showToast({ title: '红方得分', icon: 'none' });
        console.log('✅🔴【计分更新】红方击中有效，得分+1，当前分数：%s', this.data.redScore+1);
      } else if (side === 'green' && match[2] === 'GREEN') {
        this.setData({ greenScore: this.data.greenScore+1 });
        wx.showToast({ title: '绿方得分', icon: 'none' });
        console.log('✅🟢【计分更新】绿方击中有效，得分+1，当前分数：%s', this.data.greenScore+1);
      } else {
        console.log(`ℹ️🎯【${side === 'red' ? '红方':'绿方'}击中】击中颜色不匹配，不计分`);
      }
    }

    // 胜利判定
    if (this.data.gameMode === '10_points') {
      if (this.data.redScore >=10) { 
        this.pauseTimer(); 
        wx.showToast({ title: '红方获胜', icon: 'none' });
        console.log('🏆【比赛结束】红方达到10分，获胜！');
      } else if (this.data.greenScore >=10) { 
        this.pauseTimer(); 
        wx.showToast({ title: '绿方获胜', icon: 'none' });
        console.log('🏆【比赛结束】绿方达到10分，获胜！');
      }
    }
  },

  // 自定义方法（保留）
  async setUserFunction(param) {
    this.$session.setUser({ token: '1111', username: 'DIY', nickname: 'DIYGW可视化', roles: ['role1','role2'], permissions: ['user/edit','user/del'] });
    this.userInfo = this.$session.getUser();
  },
  async clearUserFunction(param) {
    this.$session.clearUser();
    this.userInfo = this.$session.getUser() || {};
  },
  async setValueFunction(param) { this.$session.setUserValue('key', 'value'); },

  // ===================== 页面卸载 【加详细日志】=====================
  onUnload() {
    console.log('♻️【页面卸载】开始释放所有蓝牙资源');
    // 独立断开红/绿蓝牙
    this.redBle.disconnect();
    this.greenBle.disconnect();
    // 清理全局蓝牙资源
    wx.stopBluetoothDevicesDiscovery({ 
      complete: () => {
        console.log('♻️【全局蓝牙】已停止蓝牙设备搜索');
      }
    });
    wx.offBluetoothDeviceFound();
    wx.offBLECharacteristicValueChange();
    wx.offBLEConnectionStateChange();
    wx.closeBluetoothAdapter({ 
      complete: () => {
        console.log('♻️【全局蓝牙】已关闭蓝牙适配器，资源释放完成');
      }
    });
    // 清理计时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      console.log('♻️【计时器】已清除比赛倒计时器');
    }
  }
});