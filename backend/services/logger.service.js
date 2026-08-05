import fs from 'fs'
import { asyncLocalStorage } from './als.service.js'

export const logger = {
	debug: (...args) => doLog('DEBUG', ...args),
	info: (...args) => doLog('INFO', ...args),
	warn: (...args) => doLog('WARN', ...args),
	error: (...args) => doLog('ERROR', ...args),
}

const logsDir = './logs'

// Under test the logger is inert. Two reasons, both practical rather than
// cosmetic: the suite deliberately exercises failure paths, so every expected
// 404 and rejected login would print a stack trace and bury the actual test
// results; and appending to logs/backend.log from parallel test workers writes
// junk into a real file that is meant to reflect the running server.
const isTest = process.env.NODE_ENV === 'test'

if (!isTest && !fs.existsSync(logsDir)) fs.mkdirSync(logsDir)

function doLog(level, ...args) {
	if (isTest) return

	const store = asyncLocalStorage.getStore()
	const userId = store?.loggedinUser?._id

	const strs = args.map(arg => (typeof arg === 'string' || _isError(arg) ? arg : JSON.stringify(arg)))

    if(userId) strs.push(userId)

	const line = `${_getTime()} - ${level} - ${strs.join(' | ')}\n`
	console.log(line)

	fs.appendFile(`${logsDir}/backend.log`, line, err => {
		if (err) console.log('FATAL: cannot write to log file')
	})
}

function _getTime() {
	let now = new Date()
	return now.toLocaleString('he')
}

function _isError(e) {
	return e && e.stack && e.message
}
