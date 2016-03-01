"use strict"

function BitBuffer() {
	var construct =
		(typeof arguments[0] == "string") ? BitBuffer.fromString :
		(arguments[0] && arguments[0].length) ? BitBuffer.fromBitArray :
		BitBuffer.fromSize
	
	var buff = construct.call(null, arguments[0], arguments[1])
	this.length = buff.length
	this.buffer = buff.buffer
}

//reading values requires us to know which order the
//internal Buffer's bytes are stored
BitBuffer.hostEndianness = require("os").endianness()

BitBuffer.fromSize = function(bitSize, buffer) {
	bitSize = +bitSize || 0 //make sure this is a number
	var
		byteSize = Math.ceil(bitSize / 8),
		buff = {}
	
	//if a Buffer is supplied, use it, other wise initialise a new one
	if (buffer != undefined) {
		buff.buffer = buffer
	} else {
		buff.buffer = new Buffer(byteSize)
		buff.buffer.fill(0)
	}
	
	//since the internal Buffer is made of complete bytes, we need to track
	//how many bits are in the BitBuffer separately
	buff.length = bitSize
	
	return buff
}

BitBuffer.fromBitArray = function(bitarr) {
	var
		bitSize = bitarr.length,
		buff = new BitBuffer(bitSize)
	
	bitarr.forEach(function(bit, bit_i){
		buff.set(bit_i, bit)
	})
	
	return buff
}

BitBuffer.fromString = function(str, enc) {
	//default to binary if no encoding is specified
	enc = (enc || "binary").toLowerCase()
	return BitBuffer["from" + enc + "str"](str) 
}

BitBuffer.fromBinaryString = BitBuffer.frombinarystr = function(bitstr) {
	var
		bitSize = bitstr.length,
		bit_i = 0,
		buff = new BitBuffer(bitSize);
	
	if (bitSize < 1) {
		return buff
	}

	//treat the string as an array of bits that has been indexed backwards
	//(bit 0 on the left)
	while (bitSize--) {
		buff.set(bit_i++, !!+bitstr[bitSize])
	}
	
	return buff
}

BitBuffer.fromHexString = BitBuffer.fromhexstr = function(hexstr) {
	var
		nybbleSize = hexstr.length,
		bitSize = nybbleSize << 2,
		buff = new BitBuffer(bitSize),
		byteVal;
	
	if (nybbleSize < 1) {
		return new BitBuffer(0)
	}

	//pad the hex string if it contains an odd number of nybbles
	if (nybbleSize % 2 != 0) {
		hexstr = "0" + hexstr
		nybbleSize++
		bitSize += 4
	}
	
	//nybble 0 is on the left
	for (var bit_i=bitSize-1, nyb_i=0; nyb_i < nybbleSize; bit_i-=8, nyb_i+=2) {
		byteVal = +("0x" + hexstr[nyb_i] + hexstr[nyb_i+1])
		if (!isFinite(byteVal)) {
			throw RangeError(
				hexstr[nyb_i] + hexstr[nyb_i+1] + " is not a valid hex value."
			)
		}
		buff.buffer[bit_i >>> 3] = +(byteVal)
	}
	
	return buff
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
		begin = +begin || 0
		end = isFinite(+end) ? end : this.length
		
		//negative values are read from the end of the buffer
		begin = begin >= 0 ? begin : this.length + begin
		end = end >= 0 ? end : this.length + end
		
		//end should come after the begining
		size = end - begin
		if (size < 1) {
			return new BitBuffer(0)
		}
		
		newbuff = new BitBuffer(size)
		
		this.copy(newbuff, 0, begin, end)
		
		return newbuff
	},
	
	copy: function(destBuff, destStart, srcStart, srcEnd) {
		destStart = +destStart || 0
		srcStart = +srcStart || 0
		srcEnd = isFinite(+srcEnd) ? srcEnd : this.length
		var length = srcEnd - srcStart
		
		if (srcEnd > this.length) {
			throw new RangeError("Can not read source BitBuffer beyond end.")
		} else if (destStart + length > destBuff.size) {
			throw new RangeError("Can not write destination BitBuffer beyond end.")
		}
		
		for (var bit_i = 0; bit_i < length; bit_i++) {
			destBuff.set(destStart + bit_i, this.get(srcStart + bit_i))
		}
		
		return length
	},
	
	toBitArray: function(bitOrder) {
		var size = this.length, maxBit = size - 1, bitarr = []
		
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
			//array index 0 is at the front
			bitarr.shift()
			bitarr.push(0)
		}
		
		this.buffer = BitBuffer.fromBitArray(bitarr).buffer
		
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
		
		this.buffer = BitBuffer.fromBitArray(bitarr).buffer
		
		return this
	},
	
	toBinaryString: function() {
		return this.toBitArray(-1).join("")
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
		return hexstr.substring(hexstr.length - (Math.ceil(this.length / 4)))
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
	read: function(type, typeWidth, endianness, offset, readWidth) {
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
			
			Long story short: if this is an LE system, we need to use the opposite 
			reader than what was requested.
		*/
		if (BitBuffer.hostEndianness == "LE") {
			endianness = endianness == "LE" ? "BE" : "LE"
		}
		
		readWidth =
			!(+readWidth > 0) ? typeWidth :
				readWidth < typeWidth ? readWidth : typeWidth
		offset = +offset || 0
		
		//create new buffer that matches the width we are going to read as a number
		buff = new BitBuffer(typeWidth)
		
		//when reading less than the full typeWidth of bits,
		//we need to sign extend the ints
		if (
			readWidth < typeWidth && type == "int" && this.get(offset + readWidth)
		) {
			buff.buffer.fill(0xff)
		}
		
		//copy all the bits to the new buffer so bit 0 is aligned with byte 0
		this.copy(buff, 0, offset, offset + readWidth)
		
		return (
			((this._byteReaders[type] || {})[typeWidth] || {})[endianness] ||
			function(){return null}
		).call(buff.buffer, 0);
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
