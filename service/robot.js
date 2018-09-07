'use strict'

const qiniu = require('qiniu')
const cloudinary = require('cloudinary')
const Promise = require('bluebird')
const sha1 = require('sha1')
const uuid = require('uuid')
const config = require('../config/api')

qiniu.conf.ACCESS_KEY = config.qiniu.AK
qiniu.conf.SECRET_KEY = config.qiniu.SK

cloudinary.config(config.cloudinary)

exports.getQiniuToken = function (body) {
	let putPolicy
	const type = body.type
	const key = uuid.v4()
	const options = {
		persistentNotifyUrl: config.notify
	}

	if (type === 'avatar') {
		// putPolicy.callbackUrl = 'http://your.domain.com/callback'
		// putPolicy.callbackBody = 'filename=$(fname)&filesize=$(fsize)'
		key += '.jpeg'
		putPolicy = new qiniu.rs.PutPolicy('gougouavatar:' + key)
	} else if (type === 'video') {
		key += '.mp4'
		options.scope = 'gougouvideo:' + key
		options.persistentOps = 'avthumb/mp4/an/1'
		putPolicy = new qiniu.rs.PutPolicy2(options)
	} else if (type === 'audio') {
		//
	}

	const token = putPolicy.token()

	return {
		key: key,
		token: token
	}
}

exports.saveToQiniu = function (url, key) {
	const client = new qiniu.rs.Client()

	return new Promise(function (resolve, reject) {
		client.fetch(url, 'gougouvideo', key, function (err, ret) {
			if (!err) {
				resolve(ret)
			} else {
				reject(err)
			}
		})
	})
}

exports.uploadToCloudinary = function (url) {
	return new Promise(function (resolve, reject) {
		cloudinary.uploader.upload(url, function (result) {
			if (result && result.public_id) {
				resolve(result)
			} else {
				reject(result)
			}
		}, {
			resource_type: 'video',
			folder: 'video'
		})
	})
}


exports.getCloudinaryToken = function (body) {
	const type = body.type
	const timestamp = body.timestamp
	let folder
	let tags

	if (type === 'avatar') {
		folder = 'avatar'
		tags = 'app,avatar'
	} else if (type === 'video') {
		folder = 'video'
		tags = 'app,video'
	} else if (type === 'audio') {
		folder = 'audio'
		tags = 'app,audio'
	}

	// data.data
	const signature = 'folder=' + folder + '&tags=' + tags + '&timestamp=' + timestamp + config.cloudinary.api_secret
	const key = uuid.v4()

	signature = sha1(signature)

	return {
		token: signature,
		key: key
	}
}
