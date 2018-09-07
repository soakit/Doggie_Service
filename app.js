'use strict'

const fs = require('fs')
const path = require('path')
const Koa = require('koa')
const logger = require('koa-logger')
const session = require('koa-session')
const bodyParser = require('koa-bodyparser')
const mongoose = require('mongoose')

const {
	port,
	dbConfig
} = require('./config/index')

mongoose.set('useCreateIndex', true);
// mongoose.Promise = require('bluebird')
mongoose.connect(dbConfig, { useNewUrlParser: true })

// 递归的形式，读取models文件夹下的js模型文件，并require
const models_path = path.join(__dirname, './models')
const walk = function (modelPath) {
	fs
		.readdirSync(modelPath)
		.forEach(function (file) {
			const filePath = path.join(modelPath, '/' + file)
			const stat = fs.statSync(filePath)

			if (stat.isFile()) {
				if (/(.*)\.(js|coffee)/.test(file)) {
					require(filePath)
				}
			} else if (stat.isDirectory()) {
				walk(filePath)
			}
		})
}
walk(models_path)

const app = new Koa()

app.use(logger())
app.use(session(app))
app.use(bodyParser())

const router = require('./router/index')()
app.use(router.routes())
	.use(router.allowedMethods())

app.listen(port)
console.log(`Listening: ${port}`)

app.on('error', (err, ctx) => {
	console.error('server error', err, ctx)
});
