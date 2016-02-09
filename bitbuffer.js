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
		end = isFinite(+end) ? +end : this.size
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
