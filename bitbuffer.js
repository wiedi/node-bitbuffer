"use strict"

function BitBuffer(number, buffer) {
	var size = Math.ceil(number / 8)
	
	if (buffer != undefined && buffer.length == size) {
		this.buffer = buffer
	} else {
		this.buffer = new Buffer(size)
		this.buffer.fill(0)
	}
	this.size = number
}


BitBuffer.prototype = {
	set: function(index, bool) {
		var pos = index >>> 3
		if(bool) {
			this.buffer[pos] |= 1 << (index % 8)
		} else {
			this.buffer[pos] &= ~(1 << (index % 8))
		}
	},
	get: function(index) {
		return (this.buffer[index >>> 3] & (1 << (index % 8))) != 0
	},
	toggle: function(index) {
		this.buffer[index >>> 3] ^= 1 << (index % 8)
	},
	toBuffer: function() {
		return this.buffer
	},
	fromBitArray: function(bitarr, noresize) {
		var bitSize = bitarr.length, byteSize = Math.ceil(bitSize / 8)

		//clear out the buffer
		if (noresize || byteSize == this.buffer.length) {
			this.buffer.fill(0)
		} else {
			this.buffer = new Buffer(byteSize)
			this.buffer.fill(0)
			this.size = bitSize
		}
		
		bitarr.forEach(function(bit, bit_i){
			this.set(bit_i, bit)
		}, this)
		
		return this
	},
	toBitArray: function(bitOrder) {
		var size = this.size, maxBit = size - 1, bitarr = []
		
		if (bitOrder < 0) {
			//bitOrder can be set to a negative number to reverse the bit array
			for (var bit_i = 0; bit_i < size; bit_i++) {
				bitarr[maxBit - bit_i] = +!!this.get(bit_i)
			}
		} else {
			for (var bit_i = 0; bit_i < size; bit_i++) {
				bitarr[bit_i] = +!!this.get(bit_i)
			}
		}
		
		return bitarr
	}
}

exports.BitBuffer = BitBuffer
