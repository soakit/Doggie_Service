const config = {
	// 启动端口
	port: 3000,
	// 数据库配置
	dbConfig: {
		host: 'localhost',
		port: 27017,
		db: 'doggie',
		max: 100,
		min: 1
	}
}

module.exports = config
