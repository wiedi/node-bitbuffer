"use strict"

function BitBuffer(number) {
	this.buffer = new Buffer(Math.ceil(number / 8))
	this.buffer.fill(0)
}

BitBuffer.prototype = {
	set: function(index, bool) {
		if(bool) {
			this.buffer[index >> 3] |= 1 << (index % 8)
		} else {
			this.buffer[index >> 3] &= ~(1 << (index % 8))
		}
	},
	get: function(index) {
		return (this.buffer[index >> 3] & (1 << (index % 8))) != 0
	},
	toggle: function(index) {
		this.buffer[index >> 3] ^= 1 << (index % 8)
	},
	toBuffer: function() {
		return this.buffer
	}
}

exports.BitBuffer = BitBuffer