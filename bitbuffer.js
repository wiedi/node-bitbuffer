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
  
  _byteIndex: null,
  _byteIndexLE: function(index) {
    return this.maxByteIndex - (index >>> 3);
  },
  _byteIndexBE: function(index) {
    return index >>> 3;
  }
}

exports.BitBuffer = BitBuffer
