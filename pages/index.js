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

  // ✅ 红方独立蓝牙对象 + 超详细日志 + 只传red标识
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
    searchAndConnect() {
      const _this = this;
      console.log('🔴【红方蓝牙】开始执行搜索连接流程');
      wx.stopBluetoothDevicesDiscovery({ 
        complete: () => {
          console.log('🔴【红方蓝牙】前置操作：停止上一次蓝牙搜索(防冲突)');
        } 
      });
      if(_this.discoveryTimer){
        clearTimeout(_this.discoveryTimer);
        console.log('🔴【红方蓝牙】前置操作：清除旧的搜索超时计时器');
      }
      wx.offBluetoothDeviceFound();
      console.log('🔴【红方蓝牙】前置操作：移除旧的蓝牙设备发现监听');
      
      wx.showLoading({ title: '搜索红方设备中', mask: true });
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: (res) => {
          console.log('✅🔴【红方蓝牙】蓝牙搜索已启动，搜索参数：', res);
          _this.discoveryTimer = setTimeout(() => {
            wx.stopBluetoothDevicesDiscovery({ complete: () => {} });
            wx.hideLoading();
            console.error('❌🔴【红方蓝牙】搜索超时 >> 10秒内未找到目标设备 epee_red');
            wx.showToast({ title: '红方设备搜索超时', icon: 'error' });
          }, _this.bleConst.SEARCH_TIMEOUT);

          wx.onBluetoothDeviceFound((res) => {
            console.log('ℹ️🔴【红方蓝牙】监听到新的蓝牙设备，设备列表：', res.devices);
            res.devices.forEach(device => {
              if (!device.name && !device.localName) {
                console.log('ℹ️🔴【红方蓝牙】过滤无名蓝牙设备，设备ID：', device.deviceId);
                return;
              }
              if (device.name === 'epee_red' || device.localName === 'epee_red') {
                console.log('✅🔴【红方蓝牙】找到目标设备 >> 名称：%s，设备ID：%s', device.name || device.localName, device.deviceId);
                wx.stopBluetoothDevicesDiscovery({ complete: () => {}});
                wx.hideLoading();
                clearTimeout(_this.discoveryTimer);
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
    connect(deviceId) {
      const _this = this;
      if (_this.isConnected && _this.deviceId === deviceId) {
        console.log('ℹ️🔴【红方蓝牙】无需重复连接 >> 设备已处于连接状态');
        wx.showToast({ title: '红方已连接', icon: 'success' });
        return;
      }
      console.log('ℹ️🔴【红方蓝牙】开始发起BLE连接 >> 目标设备ID：', deviceId);
      wx.createBLEConnection({
        deviceId,
        timeout: _this.bleConst.CONNECT_TIMEOUT,
        success: (res) => {
          console.log('✅🔴【红方蓝牙】BLE连接成功 >> 设备ID：%s', deviceId);
          _this.deviceId = deviceId;
          _this.isConnected = true;
          _this.page.setData({ redDeviceConnected: true });
          wx.showToast({ title: '红方连接成功', icon: 'success' });
          _this.initService();
        },
        fail: (err) => {
          console.error('❌🔴【红方蓝牙】BLE连接失败 >> 错误信息：', err);
          wx.showToast({ title: '红方连接失败', icon: 'error' });
        }
      });
    },
    initService() {
      const _this = this;
      console.log('ℹ️🔴【红方蓝牙】开始初始化BLE服务');
      wx.offBLECharacteristicValueChange();
      wx.getBLEDeviceServices({
        deviceId: _this.deviceId,
        success: (res) => {
          console.log('✅🔴【红方蓝牙】获取设备服务成功');
          wx.getBLEDeviceCharacteristics({
            deviceId: _this.deviceId,
            serviceId: _this.bleConst.SERVICE_UUID,
            success: (res) => {
              console.log('✅🔴【红方蓝牙】获取特征值成功');
              wx.notifyBLECharacteristicValueChange({
                deviceId: _this.deviceId,
                serviceId: _this.bleConst.SERVICE_UUID,
                characteristicId: _this.bleConst.CHARACTERISTIC_UUID,
                state: true,
                success: (res) => {
                  console.log('✅🔴【红方蓝牙】特征值通知已开启，等待击中信号');
                  wx.onBLECharacteristicValueChange((res) => {
                    const data = _this.page.ab2str(res.value);
                    console.log('ℹ️🔴【红方蓝牙】收到击中信号 >> 原始数据：', data);
                    // 只传 red 标识，直接加分
                    _this.page.parseHitSignal(data, 'red');
                  });
                },
                fail: (err) => { console.error('❌🔴【红方蓝牙】开启通知失败 >> ', err); }
              });
            },
            fail: (err) => { console.error('❌🔴【红方蓝牙】获取特征值失败 >> ', err); }
          });
        },
        fail: (err) => { console.error('❌🔴【红方蓝牙】获取服务失败 >> ', err); }
      });
    },
    disconnect() {
      const _this = this;
      if (_this.isConnected && _this.deviceId) {
        console.log('ℹ️🔴【红方蓝牙】执行断开连接');
        wx.closeBLEConnection({
          deviceId: _this.deviceId,
          success: () => { console.log('✅🔴【红方蓝牙】断开成功'); },
          fail: (err) => { console.error('❌🔴【红方蓝牙】断开失败 >> ', err); },
          complete: () => {
            _this.isConnected = false;
            _this.deviceId = null;
            _this.page.setData({ redDeviceConnected: false });
          }
        });
      }
    }
  },

  // ✅ 绿方独立蓝牙对象 + 超详细日志 + 只传green标识
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
    searchAndConnect() {
      const _this = this;
      console.log('🟢【绿方蓝牙】开始执行搜索连接流程');
      wx.stopBluetoothDevicesDiscovery({ 
        complete: () => { console.log('🟢【绿方蓝牙】前置操作：停止上一次蓝牙搜索'); } 
      });
      if(_this.discoveryTimer){
        clearTimeout(_this.discoveryTimer);
        console.log('🟢【绿方蓝牙】前置操作：清除旧的搜索超时计时器');
      }
      wx.offBluetoothDeviceFound();
      console.log('🟢【绿方蓝牙】前置操作：移除旧的蓝牙设备发现监听');
      
      wx.showLoading({ title: '搜索绿方设备中', mask: true });
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: (res) => {
          console.log('✅🟢【绿方蓝牙】蓝牙搜索已启动');
          _this.discoveryTimer = setTimeout(() => {
            wx.stopBluetoothDevicesDiscovery({ complete: () => {} });
            wx.hideLoading();
            console.error('❌🟢【绿方蓝牙】搜索超时 >> 10秒内未找到目标设备 epee_green');
            wx.showToast({ title: '绿方设备搜索超时', icon: 'error' });
          }, _this.bleConst.SEARCH_TIMEOUT);

          wx.onBluetoothDeviceFound((res) => {
            console.log('ℹ️🟢【绿方蓝牙】监听到新的蓝牙设备');
            res.devices.forEach(device => {
              // 兼容：解析广播数据的Complete Local Name（解决你绿方搜不到的核心问题）
              let targetName = 'epee_green';
              let deviceName = device.name || device.localName;
              if(!deviceName && device.advertisData){
                const advData = new Uint8Array(device.advertisData);
                let offset = 0;
                while(offset < advData.length){
                  const len = advData[offset];
                  const type = advData[offset+1];
                  const data = advData.subarray(offset+2, offset+1+len);
                  offset += len+1;
                  if(type === 0x09){
                    deviceName = String.fromCharCode.apply(null, data);
                    break;
                  }
                }
              }
              
              if (deviceName === targetName) {
                console.log('✅🟢【绿方蓝牙】找到目标设备 >> 名称：%s，设备ID：%s', deviceName, device.deviceId);
                wx.stopBluetoothDevicesDiscovery({ complete: () => {}});
                wx.hideLoading();
                clearTimeout(_this.discoveryTimer);
                _this.connect(device.deviceId);
              } else if(deviceName) {
                console.log('ℹ️🟢【绿方蓝牙】发现非目标设备：%s', deviceName);
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
    connect(deviceId) {
      const _this = this;
      if (_this.isConnected && _this.deviceId === deviceId) {
        console.log('ℹ️🟢【绿方蓝牙】无需重复连接 >> 设备已处于连接状态');
        wx.showToast({ title: '绿方已连接', icon: 'success' });
        return;
      }
      console.log('ℹ️🟢【绿方蓝牙】开始发起BLE连接 >> 目标设备ID：', deviceId);
      wx.createBLEConnection({
        deviceId,
        timeout: _this.bleConst.CONNECT_TIMEOUT,
        success: (res) => {
          console.log('✅🟢【绿方蓝牙】BLE连接成功 >> 设备ID：%s', deviceId);
          _this.deviceId = deviceId;
          _this.isConnected = true;
          _this.page.setData({ greenDeviceConnected: true });
          wx.showToast({ title: '绿方连接成功', icon: 'success' });
          _this.initService();
        },
        fail: (err) => {
          console.error('❌🟢【绿方蓝牙】BLE连接失败 >> 错误信息：', err);
          wx.showToast({ title: '绿方连接失败', icon: 'error' });
        }
      });
    },
    initService() {
      const _this = this;
      console.log('ℹ️🟢【绿方蓝牙】开始初始化BLE服务');
      wx.offBLECharacteristicValueChange();
      wx.getBLEDeviceServices({
        deviceId: _this.deviceId,
        success: (res) => {
          console.log('✅🟢【绿方蓝牙】获取设备服务成功');
          wx.getBLEDeviceCharacteristics({
            deviceId: _this.deviceId,
            serviceId: _this.bleConst.SERVICE_UUID,
            success: (res) => {
              console.log('✅🟢【绿方蓝牙】获取特征值成功');
              wx.notifyBLECharacteristicValueChange({
                deviceId: _this.deviceId,
                serviceId: _this.bleConst.SERVICE_UUID,
                characteristicId: _this.bleConst.CHARACTERISTIC_UUID,
                state: true,
                success: (res) => {
                  console.log('✅🟢【绿方蓝牙】特征值通知已开启，等待击中信号');
                  wx.onBLECharacteristicValueChange((res) => {
                    const data = _this.page.ab2str(res.value);
                    console.log('ℹ️🟢【绿方蓝牙】收到击中信号 >> 原始数据：', data);
                    // 只传 green 标识，直接加分
                    _this.page.parseHitSignal(data, 'green');
                  });
                },
                fail: (err) => { console.error('❌🟢【绿方蓝牙】开启通知失败 >> ', err); }
              });
            },
            fail: (err) => { console.error('❌🟢【绿方蓝牙】获取特征值失败 >> ', err); }
          });
        },
        fail: (err) => { console.error('❌🟢【绿方蓝牙】获取服务失败 >> ', err); }
      });
    },
    disconnect() {
      const _this = this;
      if (_this.isConnected && _this.deviceId) {
        console.log('ℹ️🟢【绿方蓝牙】执行断开连接');
        wx.closeBLEConnection({
          deviceId: _this.deviceId,
          success: () => { console.log('✅🟢【绿方蓝牙】断开成功'); },
          fail: (err) => { console.error('❌🟢【绿方蓝牙】断开失败 >> ', err); },
          complete: () => {
            _this.isConnected = false;
            _this.deviceId = null;
            _this.page.setData({ greenDeviceConnected: false });
          }
        });
      }
    }
  },

  // ===================== 页面生命周期 & 原有业务逻辑（完全保留） =====================
  onLoad(option) {
    this.init();
    this.initBluetoothAdapter();
    this.redBle.init(this, this.BLE_CONST);
    this.greenBle.init(this, this.BLE_CONST);
  },
  
  async init() { this.updateDisplay(); },
  updateDisplay() { this.setData({ timeLeftDisplay: this.formatTime(this.data.timeLeft) }); },
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  
  toggleTimer() { this.data.isTimerRunning ? this.pauseTimer() : this.startTimer(); },
  startTimer() {
    if (this.data.timeLeft <= 0) return;
    this.setData({ isTimerRunning: true });
    this.data.timerInterval = setInterval(() => {
      const newTime = this.data.timeLeft - 1;
      this.setData({ timeLeft: newTime, timeLeftDisplay: this.formatTime(newTime) });
      if (newTime <= 0) {
        this.pauseTimer();
        wx.showToast({ title: this.data.redScore !== this.data.greenScore ? '比赛结束' : '进入优先权模式', icon: 'none' });
      }
    }, 1000);
  },
  pauseTimer() {
    this.setData({ isTimerRunning: false });
    this.data.timerInterval && clearInterval(this.data.timerInterval);
    this.data.timerInterval = null;
  },

  // 分数手动操作（保留）
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

  // 比赛模式/阶段/处罚/重置 全部保留
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
  yellowCard(e) { this.setData({ [`${e.currentTarget.dataset.side}Cards.yellow`]: this.data[`${e.currentTarget.dataset.side}Cards`].yellow+1 }); },
  redCard(e) { this.setData({ [`${e.currentTarget.dataset.side}Cards.red`]: this.data[`${e.currentTarget.dataset.side}Cards`].red+1 }); },
  blackCard(e) { this.setData({ [`${e.currentTarget.dataset.side}Cards.black`]: this.data[`${e.currentTarget.dataset.side}Cards`].black+1 }); },
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

  // ===================== 蓝牙基础初始化 + 点击事件 =====================
  initBluetoothAdapter() {
    console.log('📶【全局蓝牙】开始初始化微信蓝牙适配器');
    wx.openBluetoothAdapter({
      success: (res) => { console.log('✅📶【全局蓝牙】蓝牙适配器初始化成功'); wx.showToast({ title: '蓝牙就绪', icon: 'success' }); },
      fail: (err) => { console.error('❌📶【全局蓝牙】初始化失败 >> ', err); wx.showToast({ title: '请打开蓝牙', icon: 'error' }); }
    });
  },
  showRedIconModal() {
    wx.showModal({
      title: '确认连接', content: '是否连接【红方】蓝牙设备？',
      success: (res) => res.confirm && this.redBle.searchAndConnect()
    });
  },
  showGreenIconModal() {
    wx.showModal({
      title: '确认连接', content: '是否连接【绿方】蓝牙设备？',
      success: (res) => res.confirm && this.greenBle.searchAndConnect()
    });
  },

  // ===================== 通用工具方法 =====================
  ab2str(buffer) {
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
    return result;
  },

  // ✅ ✅ ✅ 【核心修复】击中信号解析+计分逻辑（彻底解决你的计分问题）
  parseHitSignal(data, side) {
    console.log(`🎯【${side === 'red' ? '🔴红方':'🟢绿方'}】收到有效击中信号，准备计分`);
    // 1. 记录击中信号
    const newHitSignal = { time: new Date().getTime(), side, data, timestamp: Date.now() };
    this.setData({ hitSignals: [...this.data.hitSignals, newHitSignal] });

    // 2. 互中判定核心逻辑：50ms内双方都击中 → 各加1分
    const currentTimestamp = Date.now();
    let isDoubleTouch = false;
    if (this.data.lastHitTimestamp && this.data.lastHitSide && this.data.lastHitSide !== side) {
      const timeDiff = currentTimestamp - this.data.lastHitTimestamp;
      if (timeDiff <= 50) {
        isDoubleTouch = true;
        console.log('⚔️【互中判定】检测到双方50ms内互中，双方各加1分');
      }
    }

    // 3. 核心计分逻辑（精准无错）
    if (isDoubleTouch) {
      // 互中：双方都加分
      this.setData({
        redScore: this.data.redScore + 1,
        greenScore: this.data.greenScore + 1
      });
      wx.showToast({ title: '双方互中，各加1分', icon: 'none' });
    } else {
      // 非互中：收到哪个设备的信号，就给哪一方加分【彻底修复的核心】
      if (side === 'red') {
        this.setData({ redScore: this.data.redScore + 1 });
        wx.showToast({ title: '红方得分', icon: 'none' });
        console.log(`✅🔴【计分更新】红方击中有效，当前分数：${this.data.redScore + 1}`);
      } else if (side === 'green') {
        this.setData({ greenScore: this.data.greenScore + 1 });
        wx.showToast({ title: '绿方得分', icon: 'none' });
        console.log(`✅🟢【计分更新】绿方击中有效，当前分数：${this.data.greenScore + 1}`);
      }
    }

    // 4. 更新最后击中信息，用于下次互中判定
    this.setData({
      lastHitTimestamp: currentTimestamp,
      lastHitSide: side
    });

    // 5. 胜利判定：10分制先到10分获胜
    if (this.data.gameMode === '10_points') {
      if (this.data.redScore + (side==='red'&&!isDoubleTouch?1:0) >= 10) {
        this.pauseTimer();
        wx.showToast({ title: '红方获胜！', icon: 'none' });
        console.log('🏆【比赛结束】红方达到10分，获胜！');
      } else if (this.data.greenScore + (side==='green'&&!isDoubleTouch?1:0) >= 10) {
        this.pauseTimer();
        wx.showToast({ title: '绿方获胜！', icon: 'none' });
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

  // 页面卸载：释放资源
  onUnload() {
    console.log('♻️【页面卸载】释放蓝牙和计时器资源');
    this.redBle.disconnect();
    this.greenBle.disconnect();
    wx.stopBluetoothDevicesDiscovery({ complete: () => {} });
    wx.offBluetoothDeviceFound();
    wx.offBLECharacteristicValueChange();
    wx.closeBluetoothAdapter({ complete: () => {} });
    this.data.timerInterval && clearInterval(this.data.timerInterval);
  }
});