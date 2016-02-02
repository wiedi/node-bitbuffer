"use strict"
var os = require('os');

function BitBuffer(number, buffer) {
	var size = Math.ceil(number / 8)
  
	if (buffer != undefined && buffer.length == size) {
		this.buffer = buffer
	} else {
		this.buffer = new Buffer(size)
		this.buffer.fill(0)
	}
  this.maxByteIndex = this.buffer.length - 1;
  this.size = this.buffer.length * 8;
  
  /*
    If this is a little endian system, byte 0 would be on the left hand side
    of the buffer. However, since this is supposed to represend a bit array,
    we should foce a big endian layout by reversing the byte order so byte 0
    is on the right. 
  */
  this._byteIndex = os.endianness() == "LE" ?
    this._byteIndexLE : this._byteIndexBE; 
}


BitBuffer.prototype = {
	set: function(index, bool) {
		if(bool) {
			this.buffer[this._byteIndex(index)] |= 1 << (index % 8);
		} else {
			this.buffer[this._byteIndex(index)] &= ~(1 << (index % 8));
		}
	},
	get: function(index) {
    return (this.buffer[this._byteIndex(index)] & (1 << (index % 8))) != 0;
	},
	toggle: function(index) {
		this.buffer[this._byteIndex(index)] ^= 1 << (index % 8);
	},
	
  toBuffer: function() {
		return this.buffer
	},
  toBitArray: function(bitOrder) {
    var
      size = this.size,
      maxBit = size - 1,
      boolarr = [];
    
    if (bitOrder < 0) {
      //bitOrder can be set to a negative number to reverse the bit array
      for (var bit_i = 0; bit_i < size; bit_i++) {
        boolarr[maxBit - bit_i] = +!!this.get(bit_i);
      }
    } else {
      for (var bit_i = 0; bit_i < size; bit_i++) {
        boolarr[bit_i] = +!!this.get(bit_i);
      }
    }
    
    return boolarr;
  },
  toBinaryString: function() {
    return this.toBitArray(-1).join("");
  },
  
  resize: function(bitSize) {
    var
      oldSize = this.buffer.length,
      newSize = Math.ceil(bitSize / 8),
      newbuff;
      
    if (!isFinite(newSize) || oldSize == newSize) {
      return;
    }
    
    newbuff = (new Buffer(newSize)).fill(0);
    
    if (newSize > oldSize) {
      //if this is an LE system, we need to make sure the start byte is offset
      //so the extra size will come in on the left side
      this.buffer.copy(
        newbuff, (os.endianness() == "LE" ? newSize - oldSize : 0), 0, oldSize
      );
    } else {
      //if this is an LE system, we need to make sure the start byte is offset
      //so the bit field will be trucated on the left
      this.buffer.copy(
        newbuff, 0, (os.endianness() == "LE" ? oldSize - newSize : 0), oldSize
      );
    }
    
    this.buffer = newbuff;
    this.maxByteIndex = newbuff.length - 1;
    this.size = newbuff.length * 8;
    
    return this;
  },
  _byteIndex: null,
  _byteIndexLE: function(index) {
    return this.maxByteIndex - (index >>> 3);
  },
  _byteIndexBE: function(index) {
    return index >>> 3;
  }
}

exports.BitBuffer = BitBuffer
