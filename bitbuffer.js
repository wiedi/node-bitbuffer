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
	
	resize: function(newBitSize, propagateSignBit) {
		var
			oldBitSize = this.size,
			oldByteSize = this.buffer.length,
			newByteSize = Math.ceil(newBitSize / 8),
			newbuff, lastByte, bit_i;

		if (!isFinite(newByteSize)) {
			return this
		}
		
		//check if both sign propagation flag and sign bit are set
		propagateSignBit = propagateSignBit & this.get(oldBitSize - 1)
		
		if (newByteSize > oldByteSize) {
			newbuff = new Buffer(newByteSize)
			newbuff.fill(0)
			
			this.buffer.copy(newbuff, 0, 0, oldByteSize)
			this.buffer = newbuff

		} else {
			//We are shirinking the buffer, instead of creating a new buffer 
			//and copying, we can just take the slice of the data we need.
			this.buffer = this.buffer.slice(0, newByteSize)
		}

		//update the size properties
		this.size = newBitSize

		if (newBitSize % 8 != 0) {
			//zero out any bits beyond the specified size in the last byte
			lastByte = newBitSize >>> 3
			newbuff[lastByte] = newbuff[lastByte] & (Math.pow(2, newBitSize)-1)
		}
		
		//flip all of the leading bits if we are propagating sign
		if (propagateSignBit) {
			bit_i = oldBitSize
			while (bit_i < newBitSize) {
				this.set(bit_i++, 1)
			}
		}
		return this
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
