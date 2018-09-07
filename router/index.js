'use strict'

const Router = require('koa-router')
const User = require('../controllers/user')
const Creation = require('../controllers/creation')
const Comment = require('../controllers/comment')
const {
	hasBody,
	hasToken,
	signature
} = require('../middlewares/')

module.exports = function () {
	const router = new Router({
		prefix: '/api'
	})

	// user
	router.post('/u/signup', hasBody, User.signup)
	router.post('/u/verify', hasBody, User.verify)
	router.post('/u/update', hasBody, hasToken, User.update)

	// app
	router.post('/signature', hasBody, hasToken, signature)

	// creations
	router.get('/creations', hasToken, Creation.find)
	router.post('/creations', hasBody, hasToken, Creation.save)
	router.post('/creations/video', hasBody, hasToken, Creation.video)
	router.post('/creations/audio', hasBody, hasToken, Creation.audio)

	// comments
	router.get('/comments', hasToken, Comment.find)
	router.post('/comments', hasBody, hasToken, Comment.save)

	// votes
	router.post('/up', hasBody, hasToken, Creation.up)

	return router
}
