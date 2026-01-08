Page({
	data: {
		//用户全局信息
		userInfo: {}
	},
	onLoad(option) {
		this.init();
	},
	onShow() {},
	async init() {},

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
