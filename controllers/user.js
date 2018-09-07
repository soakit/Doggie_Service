'use strict'

const xss = require('xss')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const uuid = require('uuid')
const sms = require('../service/sms')


exports.signup = function* (next) {
	const phoneNumber = xss(this.request.body.phoneNumber.trim())

	const user = yield User.findOne({
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
		user = yield user.save()
	} catch (e) {
		this.body = {
			success: false
		}

		return next
	}

	const msg = '您的注册验证码是：' + user.verifyCode

	try {
		sms.send(user.phoneNumber, msg)
	} catch (e) {
		console.log(e)

		this.body = {
			success: false,
			err: '短信服务异常'
		}

		return next
	}

	this.body = {
		success: true
	}
}

exports.verify = function* (next) {
	const verifyCode = this.request.body.verifyCode
	const phoneNumber = this.request.body.phoneNumber

	if (!verifyCode || !phoneNumber) {
		this.body = {
			success: false,
			err: '验证没通过'
		}

		return next
	}

	const user = yield User.findOne({
		phoneNumber: phoneNumber,
		verifyCode: verifyCode
	}).exec()

	if (user) {
		user.verified = true
		user = yield user.save()

		this.body = {
			success: true,
			data: {
				nickname: user.nickname,
				accessToken: user.accessToken,
				avatar: user.avatar,
				_id: user._id
			}
		}
	} else {
		this.body = {
			success: false,
			err: '验证未通过'
		}
	}
}

exports.update = function* (next) {
	const body = this.request.body
	const user = this.session.user
	const fields = 'avatar,gender,age,nickname,breed'.split(',')

	fields.forEach(function (field) {
		if (body[field]) {
			user[field] = xss(body[field].trim())
		}
	})

	user = yield user.save()

	this.body = {
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
