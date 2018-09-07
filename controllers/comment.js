'use strict'

const mongoose = require('mongoose')
const Comment = mongoose.model('Comment')
const Creation = mongoose.model('Creation')

const userFields = [
	'avatar',
	'nickname',
	'gender',
	'age',
	'breed'
]

exports.find = function* (next) {
	const id = this.query.creation

	if (!id) {
		this.body = {
			success: false,
			err: 'id 不能为空'
		}

		return next
	}

	const queryArray = [
		Comment.find({
			creation: id
		})
		.populate('replyBy', userFields.join(' '))
		.sort({
			'meta.createAt': -1
		})
		.exec(),
		Comment.count({ creation: id }).exec()
	]

	const data = yield queryArray

	this.body = {
		success: true,
		data: data[0],
		total: data[1]
	}
}

exports.save = function* (next) {
	const commentData = this.request.body.comment
	const user = this.session.user
	const creation = yield Creation.findOne({
			_id: commentData.creation
		})
		.exec()

	if (!creation) {
		this.body = {
			success: false,
			err: '视频不见了'
		}

		return next
	}

	let comment

	if (commentData.cid) {
		comment = yield Comment.findOne({
				_id: commentData.cid
			})
			.exec()

		const reply = {
			from: commentData.from,
			to: commentData.tid,
			content: commentData.content
		}

		comment.reply.push(reply)

		comment = yield comment.save()

		this.body = {
			success: true
		}
	} else {
		comment = new Comment({
			creation: creation._id,
			replyBy: user._id,
			replyTo: creation.author,
			content: commentData.content
		})

		comment = yield comment.save()

		this.body = {
			success: true,
			data: [comment]
		}
	}
}
