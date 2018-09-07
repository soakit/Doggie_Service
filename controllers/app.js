'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const robot = require('../service/robot')

exports.signature = function* (next) {
	const body = this.request.body
	const cloud = body.cloud
	const data

	if (cloud === 'qiniu') {
		data = robot.getQiniuToken(body)
	} else {
		data = robot.getCloudinaryToken(body)
	}

	this.body = {
		success: true,
		data: data
	}
}

exports.hasBody = function* (next) {
	const body = this.request.body || {}

	if (Object.keys(body).length === 0) {
		this.body = {
			success: false,
			err: '是不是漏掉什么了'
		}

		return next
	}

	yield next
}

exports.hasToken = function* (next) {
	const accessToken = this.query.accessToken

	if (!accessToken) {
		accessToken = this.request.body.accessToken
	}

	if (!accessToken) {
		this.body = {
			success: false,
			err: '钥匙丢了'
		}

		return next
	}

	const user = yield User.findOne({
			accessToken: accessToken
		})
		.exec()

	if (!user) {
		this.body = {
			success: false,
			err: '用户没登陆'
		}

		return next
	}

	this.session = this.session || {}
	this.session.user = user

	yield next
}
