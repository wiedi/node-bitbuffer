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
  subbuffer: function(begin, end) {
		var newbuff, size 
		
		//make sure begin and end are valid
		begin = isFinite(+begin) ? begin : 0,
		end = isFinite(+end) ? end : this.size
		begin = begin >= 0 ? begin : 0
		end = end <= this.size ? end : this.size
		size = end - begin
		if (size < 1) {
			return new BitBuffer(0)
		}
		
		newbuff = new BitBuffer(size)
		for (var bit_i = 0; bit_i < size; bit_i++) {
			newbuff.set(bit_i, this.get(bit_i + begin))
		}
		return newbuff
	},	
}

exports.BitBuffer = BitBuffer
