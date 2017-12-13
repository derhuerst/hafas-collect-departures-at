'use strict'

const maxBy = require('lodash.maxby')

const validId = /^\d{9,12}$/
const minute = 60 * 1000

const createCollectDeps = (fetchDepartures) => {
	if ('function' !== typeof fetchDepartures) {
		throw new Error('fetchDepartures must be a function.')
	}

	const collectDeps = (id, initialWhen) => {
		if ('string' !== typeof id || !validId.test(id)) {
			throw new Error('id must be a string with 9 to 12 digits.')
		}
		initialWhen = +initialWhen
		if (
			'number' !== typeof initialWhen ||
			Number.isNaN(initialWhen) ||
			initialWhen === 0
		) {
			throw new Error('when must be a valid Date or timestamp > 0.')
		}

		const makeIterator = () => {
			let when = initialWhen

			const iterate = (duration = 10) => {
				return fetchDepartures(id, {when, duration})
				.then((deps) => {
					// todo: warn somehow if 0 departures
					if (deps.length > 0) {
						const last = maxBy(deps, (d) => {
							const w = +new Date(d.when)
							return Number.isNaN(w) ? 0 : w
						})

						// The HAFAS APIs return departures up to 59s earlier.
						// To prevent the collection from "getting stuck",
						// we increase `when` by a minute.
						const lastWhen = +new Date(last.when)
						if (lastWhen === when) when += minute
						else when = lastWhen
					} else when += duration * minute

					return {done: false, value: deps}
				})
			}

			return {next: iterate}
		}

		const iterable = {}
		iterable[Symbol.iterator] = makeIterator
		return iterable
	}
	return collectDeps
}

module.exports = createCollectDeps
