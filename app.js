require('./page-extend');
App({
	globalData: {
		userInfo: null,
		tabBar: [],
		homePage: '/pages/index',
		pages: ['/pages/index']
	},
	onLaunch() {
		wx.getSystemInfo({
			success: (e) => {
				this.globalData.StatusBar = e.statusBarHeight;
				let capsule = wx.getMenuButtonBoundingClientRect();
				this.globalData.WindowWidth = e.windowWidth;
				this.globalData.PixelRatio = 750 / e.windowWidth;
				if (capsule) {
					this.globalData.Custom = capsule;
					this.globalData.CustomBar = capsule.bottom + capsule.top - e.statusBarHeight;
				} else {
					this.globalData.CustomBar = e.statusBarHeight + 50;
				}
			}
		});
	},
	onShow() {},
	onHide() {}
});
