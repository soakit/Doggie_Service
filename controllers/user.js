'use strict'

const xss = require('xss')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const uuid = require('uuid')
const sms = require('../service/sms')


exports.signup = async function (ctx) {
	const phoneNumber = xss(ctx.request.body.phoneNumber.trim())
	let user = await User.findOne({
		phoneNumber: phoneNumber
	}).exec()

	const verifyCode = sms.getCode()

	if (!user) {
		const accessToken = uuid.v4()

		user = new User({
			nickname: '小狗宝',
			avatar: 'http://res.cloudinary.com/gougou/image/upload/mooc1.png',
			phoneNumber: xss(phoneNumber),
			verifyCode: verifyCode,
			accessToken: accessToken
		})
	} else {
		user.verifyCode = verifyCode
	}

	try {
		user = await user.save()
	} catch (e) {
		ctx.body = {
			success: false
		}

		return
	}

	const msg = '您的注册验证码是：' + user.verifyCode

	try {
		sms.send(user.phoneNumber, msg)
	} catch (e) {
		console.log(e)

		ctx.body = {
			success: false,
			err: '短信服务异常'
		}

		return
	}

	ctx.body = {
		success: true
	}
}

exports.verify = async function (ctx) {
	const verifyCode = ctx.request.body.verifyCode
	const phoneNumber = ctx.request.body.phoneNumber

	if (!verifyCode || !phoneNumber) {
		ctx.body = {
			success: false,
			err: '验证没通过'
		}

		return
	}

	let user = await User.findOne({
		phoneNumber: phoneNumber,
		verifyCode: verifyCode
	}).exec()

	if (user) {
		user.verified = true
		user = await user.save()

		ctx.body = {
			success: true,
			data: {
				nickname: user.nickname,
				accessToken: user.accessToken,
				avatar: user.avatar,
				_id: user._id
			}
		}
	} else {
		ctx.body = {
			success: false,
			err: '验证未通过'
		}
	}
}

exports.update = async function (ctx) {
	const body = ctx.request.body
	let user = ctx.session.user
	const fields = 'avatar,gender,age,nickname,breed'.split(',')

	fields.forEach(function (field) {
		if (body[field]) {
			user[field] = xss(body[field].trim())
		}
	})

	user = await user.save()

	ctx.body = {
		success: true,
		data: {
			nickname: user.nickname,
			accessToken: user.accessToken,
			avatar: user.avatar,
			age: user.age,
			breed: user.breed,
			gender: user.gender,
			_id: user._id
		}
	}
}
