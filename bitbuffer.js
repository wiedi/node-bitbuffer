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
	
	fromBinaryString: function(bitstr, noresize) {
		//treat the string as an array of bits that has been indexed backwards
		var bitSize = bitstr.length, byteSize = Math.ceil(bitSize / 8), bit_i = 0
		
		if (bitSize < 1) {
			return this.resize(0)
		}

		//clear out the buffer
		if (noresize || byteSize == this.buffer.length) {
			this.buffer.fill(0)
		} else {
			this.buffer = new Buffer(byteSize)
			this.buffer.fill(0)
			this.size = bitSize
		}

		while (bitSize--) {
			this.set(bit_i++, !!+bitstr[bitSize])
		}
		
		return this
	},
	toBinaryString: function() {
		return this.toBitArray(-1).join("")
	},
 
	fromHexString: function(hexstr, noresize) {
		//treat the string as an array of bits that has been indexed backwards
		var
			nybbleSize = hexstr.length,
			byteSize = Math.ceil(nybbleSize / 2),
			bitSize = nybbleSize << 2;
		
		if (nybbleSize < 1) {
			return this.resize(0)
		}
		
		//clear out the buffer
		if (noresize || byteSize == this.buffer.length) {
			this.buffer.fill(0)
		} else {
			this.buffer = new Buffer(byteSize)
			this.buffer.fill(0)
			this.size = bitSize
		}
		
		//pad the hex string if it does not contain an integer number of bytes
		if (nybbleSize % 2 != 0) {
			hexstr = "0" + hexstr
			nybbleSize++
			bitSize += 4
		}
		
		for (var bit_i=bitSize-1, nyb_i=0; nyb_i < nybbleSize; bit_i-=8, nyb_i+=2) {
			this.buffer[bit_i >>> 3]=+("0x"+hexstr[nyb_i]+hexstr[nyb_i+1])
		}
		
		return this
	},
	toHexString: function() {
		var byte_i = this.buffer.length, hexarr = [], hexstr
		
		while (byte_i--) {
			hexarr.push(
				(this.buffer[byte_i] < 0x10 ? "0" : "") +
				this.buffer[byte_i].toString(16)
			)
		}
		
		hexstr = hexarr.join("")
	 
		//the string will be in whole bytes.
		//However, if our bit buffer size is not in whole bytes,
		//we should chop off any leading nybbles before returning
		return hexstr.substring(hexstr.length - (Math.ceil(this.size / 4)))
	}
}

exports.BitBuffer = BitBuffer
