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
	this.hostEndianness = require("os").endianness()
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
			this[lastByte] = this[lastByte] & (Math.pow(2, newBitSize)-1)
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
		begin = isFinite(+begin) ? begin : 0
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
	},
	
	readUInt8: function(offset, width){
		return this.read("uint", 8, null, offset, width)
	},
	readUInt16BE: function(offset, width){
		return this.read("uint", 16, "BE", offset, width)
	},
	readUInt16LE: function(offset, width){
		return this.read("uint", 16, "LE", offset, width)
	},
	readUInt32BE: function(offset, width){
		return this.read("uint", 32, "BE", offset, width)
	},
	readUInt32LE: function(offset, width){
		return this.read("uint", 32, "LE", offset, width)
	},
	readInt8: function(offset, width){
		return this.read("int", 8, null, offset, width)
	},
	readInt16BE: function(offset, width){
		return this.read("int", 16, "BE", offset, width)
	},
	readInt16LE: function(offset, width){
		return this.read("int", 16, "LE", offset, width)
	},
	readInt32BE: function(offset, width){
		return this.read("int", 32, "BE", offset, width)
	},
	readInt32LE: function(offset, width){
		return this.read("int", 32, "LE", offset, width)
	},
	readFloatBE: function(offset){
		return this.read("float", 32, "BE", offset)
	},
	readFloatLE: function(offset){
		return this.read("float", 32, "LE", offset)
	},
	readDoubleBE: function(offset){
		return this.read("double", 64, "BE", offset)
	},
	readDoubleLE: function(offset){
		return this.read("double", 64, "LE", offset)
	},
	read: function(type, typeWidth, endianness, offset, width) {
		var buff
		
		//validate that input and fill in any blanks we can
		type = (type + "").toLowerCase()
		if (type == "float") {
			typeWidth = 32
		} else if (type == "double") {
			typeWidth = 64
		}
		if (typeWidth == 8) {
			endianness = "BE"
		}
		if (!typeWidth || !endianness) {
			//dont really know what to do here...
			return null
		}
		
		
		/*
		  If this is running on a little endian system, the underlying Buffer has
		  been written "backwards" byte indicies.
			That is to say you did this: 
				`(new Buffer(2)).write("0001", hex)`
			you would end up with two bytes of memory that look like this:
				`[00][01]`
			However, because of the way BitBuffer fills memory it uses the host to
			decide where each bit is stored. So if you did this on an LE system:
				`(new BitBuffer(16)).set(0,1)`
			the underlying Buffer would have two bytes of memory that look like this:
				[01][00]
			
			So, if you wanted to read out a BE number from memory on a LE system you
			would actually have to read it as a LE number.
			
			Long story short: if this is an LE system, we need to use the opposite reader
			than what was requested.
		*/
		if (this.hostEndianness == "LE") {
			endianness = endianness == "LE" ? "BE" : "LE"
		}
		
		width = !(+width > 0) ? typeWidth : width < typeWidth ? width : typeWidth
		offset = +offset || 0
		
		//create a new buffer which has bit 0 aligned with byte 0
		buff = this.subbuffer(offset, (offset + width))
		
		//if subbuffer didnt give us enough bits, grow with resize
		if (typeWidth > buff.size) {
			buff.resize(typeWidth, (type == "int"))
		}
		
		return (((this._byteReaders[type] || {})[typeWidth] || {})[endianness] || function(){return null}).call(buff.buffer, 0);
	},
	_byteReaders: {
		"uint": {
			8: {
				"LE": Buffer.prototype.readUInt8,
				"BE": Buffer.prototype.readUInt8
			},
			16: {
				"LE": Buffer.prototype.readUInt16LE,
				"BE": Buffer.prototype.readUInt16BE
			},
			32: {
				"LE": Buffer.prototype.readUInt32LE,
				"BE": Buffer.prototype.readUInt32BE
			}
		},
		"int": {
			8: {
				"LE": Buffer.prototype.readInt8,
				"BE": Buffer.prototype.readInt8
			},
			16: {
				"LE": Buffer.prototype.readInt16LE,
				"BE": Buffer.prototype.readInt16BE
			},
			32: {
				"LE": Buffer.prototype.readInt32LE,
				"BE": Buffer.prototype.readInt32BE
			}
		},
		"float": {
	  	32: {
				"LE": Buffer.prototype.readFloatLE,
				"BE": Buffer.prototype.readFloatBE
			}
		},
		"double": {
	  	64: {
				"LE": Buffer.prototype.readDoubleLE,
				"BE": Buffer.prototype.readDoubleBE
			}
		}
	}
}

exports.BitBuffer = BitBuffer
