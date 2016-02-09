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
	},
	
	shiftRight: function(shiftBits) {
		if (shiftBits < 0) {
			return this.shiftLeft(-shiftBits)
		}
		
		var bitarr = this.toBitArray()
		
		while (shiftBits--) {
			//shift the bits off the "front" of the array
			//array index 0 is at the front, which corresponds to 
			//LSB on the right of the bit string
			bitarr.shift()
			bitarr.push(0)
		}
		
		this.fromBitArray(bitarr)
		
		return this
	},
	shiftLeft: function(shiftBits) {
		if (shiftBits < 0) {
			return this.shiftRight(-shiftBits)
		}
		
		var bitarr = this.toBitArray()
		
		while (shiftBits--) {
			//unshift empty bits onto the front of the array
			//and pop the extra bit off the end
			bitarr.unshift(0)
			bitarr.pop()
		}
		
		this.fromBitArray(bitarr)
		
		return this
	}
}

exports.BitBuffer = BitBuffer
