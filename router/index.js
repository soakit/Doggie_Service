'use strict'

const Router = require('koa-router')
const User = require('../controllers/user')
const App = require('../controllers/app')
const Creation = require('../controllers/creation')
const Comment = require('../controllers/comment')

module.exports = function () {
	const router = new Router({
		prefix: '/api'
	})

	// user
	router.post('/u/signup', App.hasBody, User.signup)
	router.post('/u/verify', App.hasBody, User.verify)
	router.post('/u/update', App.hasBody, App.hasToken, User.update)

	// app
	router.post('/signature', App.hasBody, App.hasToken, App.signature)

	// creations
	router.get('/creations', App.hasToken, Creation.find)
	router.post('/creations', App.hasBody, App.hasToken, Creation.save)
	router.post('/creations/video', App.hasBody, App.hasToken, Creation.video)
	router.post('/creations/audio', App.hasBody, App.hasToken, Creation.audio)

	// comments
	router.get('/comments', App.hasToken, Comment.find)
	router.post('/comments', App.hasBody, App.hasToken, Comment.save)

	// votes
	router.post('/up', App.hasBody, App.hasToken, Creation.up)

	return router
}
