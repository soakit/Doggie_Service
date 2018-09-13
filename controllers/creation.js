'use strict'

const _ = require('lodash')
const mongoose = require('mongoose')
const Promise = require('bluebird')
const Video = mongoose.model('Video')
const Audio = mongoose.model('Audio')
const Creation = mongoose.model('Creation')
const xss = require('xss')
const robot = require('../service/robot')
const config = require('../config/api')

exports.up = async function (next) {
	const body = this.request.body
	const user = this.session.user
	const creation = await Creation.findOne({
			_id: body.id
		})
		.exec()

	if (!creation) {
		this.body = {
			success: false,
			err: '视频找不到了！'
		}

		return next
	}

	if (body.up === 'yes') {
		creation.votes.push(String(user._id))
	} else {
		creation.votes = _.without(creation.votes, String(user._id))
	}

	creation.up = creation.votes.length

	await creation.save()

	this.body = {
		success: true
	}
}

const userFields = [
	'avatar',
	'nickname',
	'gender',
	'age',
	'breed'
]

exports.find = async function (ctx) {
	const page = parseInt(ctx.query.page, 10) || 1
	const count = 5
	const offset = (page - 1) * count
	const queryArray = [
		Creation
		.find({ finish: 100 })
		.sort({
			'meta.createAt': -1
		})
		.skip(offset)
		.limit(count)
		.populate('author', userFields.join(' '))
		.exec(),
		Creation.countDocuments({ finish: 100 }).exec()
	]

	const data = await Promise.all(queryArray)
	ctx.body = {
		success: true,
		data: data[0],
		total: data[1]
	}
}

function asyncMedia(videoId, audioId) {
	if (!videoId) return

	console.log(videoId)
	console.log(audioId)
	const query = {
		_id: audioId
	}

	if (!audioId) {
		query = {
			video: videoId
		}
	}

	Promise.all([
			Video.findOne({ _id: videoId }).exec(),
			Audio.findOne(query).exec()
		])
		.then(function (data) {
			console.log(data)
			const video = data[0]
			const audio = data[1]

			console.log('检查数据有效性')
			if (!video || !video.public_id || !audio || !audio.public_id) {
				return
			}

			console.log('开始同步音频视频')

			const video_public_id = video.public_id
			const audio_public_id = audio.public_id.replace(/\//g, ':')
			const videoName = video_public_id.replace(/\//g, '_') + '.mp4'
			const videoURL = 'http://res.cloudinary.com/gougou/video/upload/e_volume:-100/e_volume:400,l_video:' + audio_public_id + '/' + video_public_id + '.mp4'
			const thumbName = video_public_id.replace(/\//g, '_') + '.jpg'
			const thumbURL = 'http://res.cloudinary.com/gougou/video/upload/' + video_public_id + '.jpg'

			console.log('同步视频到七牛')

			robot
				.saveToQiniu(videoURL, videoName)
				.catch(function (err) {
					console.log(err)
				})
				.then(function (response) {
					if (response && response.key) {
						audio.qiniu_video = response.key
						audio.save().then(function (_audio) {
							Creation.findOne({
									video: video._id,
									audio: audio._id
								}).exec()
								.then(function (_creation) {
									if (_creation) {
										if (!_creation.qiniu_video) {
											_creation.qiniu_video = _audio.qiniu_video
											_creation.save()
										}
									}
								})
							console.log(_audio)
							console.log('同步视频成功')
						})
					}
				})

			robot
				.saveToQiniu(thumbURL, thumbName)
				.catch(function (err) {
					console.log(err)
				})
				.then(function (response) {
					if (response && response.key) {
						audio.qiniu_thumb = response.key
						audio.save().then(function (_audio) {
							Creation.findOne({
									video: video._id,
									audio: audio._id
								}).exec()
								.then(function (_creation) {
									if (_creation) {
										if (!_creation.qiniu_video) {
											_creation.qiniu_thumb = _audio.qiniu_thumb
											_creation.save()
										}
									}
								})
							console.log(_audio)
							console.log('同步封面成功')
						})
					}
				})
		})
}

exports.audio = async function (next) {
	const body = this.request.body
	const audioData = body.audio
	const videoId = body.videoId
	const user = this.session.user

	if (!audioData || !audioData.public_id) {
		this.body = {
			success: false,
			err: '音频没有上传成功！'
		}

		return next
	}

	const audio = await Audio.findOne({
			public_id: audioData.public_id
		})
		.exec()

	const video = await Video.findOne({
			_id: videoId
		})
		.exec()

	if (!audio) {
		const _audio = {
			author: user._id,
			public_id: audioData.public_id,
			detail: audioData
		}

		if (video) {
			_audio.video = video._id
		}

		audio = new Audio(_audio)
		audio = await audio.save()
	}

	// 异步操作
	asyncMedia(video._id, audio._id)

	this.body = {
		success: true,
		data: audio._id
	}
}


exports.video = async function (ctx) {
	const body = ctx.request.body
	const videoData = body.video
	const user = ctx.session.user

	if (!videoData || !videoData.key) {
		ctx.body = {
			success: false,
			err: '视频没有上传成功！'
		}

		return
	}

	const video = await Video.findOne({
			qiniu_key: videoData.key
		})
		.exec()

	if (!video) {
		video = new Video({
			author: user._id,
			qiniu_key: videoData.key,
			persistentId: videoData.persistentId
		})

		video = await video.save()
	}

	const url = config.qiniu.video + video.qiniu_key

	robot
		.uploadToCloudinary(url)
		.then(function (data) {
			if (data && data.public_id) {
				video.public_id = data.public_id
				video.detail = data

				video.save().then(function (_video) {
					asyncMedia(_video._id)
				})
			}
		})

	ctx.body = {
		success: true,
		data: video._id
	}
}

exports.save = async function (ctx, next) {
	const body = ctx.request.body
	const videoId = body.videoId
	const audioId = body.audioId
	const title = body.title
	const user = ctx.session.user

	const video = await Video.findOne({
		_id: videoId
	}).exec()
	const audio = await Audio.findOne({
		_id: audioId
	}).exec()

	if (!video || !audio) {
		ctx.body = {
			success: false,
			err: '音频或者视频素材不能为空'
		}

		return next
	}

	const creation = await Creation.findOne({
		audio: audioId,
		video: videoId
	}).exec()

	if (!creation) {
		const creationData = {
			author: user._id,
			title: xss(title),
			audio: audioId,
			video: videoId,
			finish: 20
		}

		const video_public_id = video.public_id
		const audio_public_id = audio.public_id

		if (video_public_id && audio_public_id) {
			creationData.cloudinary_thumb = 'http://res.cloudinary.com/gougou/video/upload/' + video_public_id + '.jpg'
			creationData.cloudinary_video = 'http://res.cloudinary.com/gougou/video/upload/e_volume:-100/e_volume:400,l_video:' + audio_public_id.replace(/\//g, ':') + '/' + video_public_id + '.mp4'

			creationData.finish += 20
		}

		if (audio.qiniu_thumb) {
			creationData.qiniu_thumb = audio.qiniu_thumb

			creationData.finish += 30
		}

		if (audio.qiniu_video) {
			creationData.qiniu_video = audio.qiniu_video

			creationData.finish += 30
		}
		creation = new Creation(creationData)
	}

	creation = await creation.save()

	console.log(creation)

	ctx.body = {
		success: true,
		data: {
			_id: creation._id,
			finish: creation.finish,
			title: creation.title,
			qiniu_thumb: creation.qiniu_thumb,
			qiniu_video: creation.qiniu_video,
			author: {
				avatar: user.avatar,
				nickname: user.nickname,
				gender: user.gender,
				breed: user.breed,
				_id: user._id
			}
		}
	}
}
