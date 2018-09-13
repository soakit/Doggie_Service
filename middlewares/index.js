'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const robot = require('../service/robot')

exports.signature = async function (ctx, next) {
	const body = ctx.request.body
	const cloud = body.cloud
	let data = null

	if (cloud === 'qiniu') {
		data = robot.getQiniuToken(body)
	} else {
		data = robot.getCloudinaryToken(body)
	}

	ctx.body = {
		success: true,
		data: data
	}
	console.log(body, data)
}

exports.hasBody = async function (ctx, next) {
	const body = ctx.request.body || {}
	if (Object.keys(body).length === 0) {
		ctx.body = {
			success: false,
			err: '是不是漏掉什么了'
		}

		return
	}

	await next()
}

exports.hasToken = async function (ctx, next) {
	let accessToken = ctx.query.accessToken

	if (!accessToken) {
		accessToken = ctx.request.body.accessToken
	}

	if (!accessToken) {
		ctx.body = {
			success: false,
			err: '钥匙丢了'
		}

		return next
	}

	const user = await User.findOne({
			accessToken: accessToken
		})
		.exec()

	if (!user) {
		ctx.body = {
			success: false,
			err: '用户没登陆'
		}

		return next
	}

	ctx.session = ctx.session || {}
	ctx.session.user = user

	await next()
}
