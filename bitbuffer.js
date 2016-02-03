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
  
  fromBitArray: function(bitarr, noresize) {
    var
      bitSize = bitarr.length,
      byteSize = Math.ceil(bitSize / 8);

    //clear out the buffer
    if (noresize || byteSize == this.buffer.length) {
      this.buffer.fill(0);
    } else {
      this.buffer = new Buffer(byteSize)
      this.buffer.fill(0);
      this.maxByteIndex = byteSize - 1;
      this.size = this.buffer.length * 8;
    }
    
    bitarr.forEach(function(bit, bit_i){
      this.set(bit_i, bit)
    }, this);
    
    return this;
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
  
  fromBinaryString: function(bitstr, noresize) {
    //treat the string as an array of bits that has been indexed backwards
    var
      bitSize = bitstr.length,
      bitarr = [];
    
    while (bitSize--) {
      bitarr.push(!!+bitstr[bitSize]);
    }
    
    return this.fromBitArray(bitarr, noresize);
  },
  toBinaryString: function() {
    return this.toBitArray(-1).join("");
  },
  
  resize: function(bitSize) {
    var
      oldSize = this.buffer.length,
      newSize = Math.ceil(bitSize / 8),
      newbuff, lastByte;
      
    if (!isFinite(newSize)) {
      return this;
    }
    
    newbuff = new Buffer(newSize);
    newbuff.fill(0);
    
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
    
    if (bitSize % 8 != 0) {
      //zero out any bits beyond the specified size in the last byte
      lastByte = this._byteIndex(bitSize);
      newbuff[lastByte] = newbuff[lastByte] & (Math.pow(2, bitSize)-1);
    }
    
    return this;
  },
  subbuffer: function(begin, end) {
    return (new BitBuffer()).fromBitArray(this.toBitArray().slice(begin, end));
  },
  shiftRight: function(shiftBits) {
    if (shiftBits < 0) {
      return this.shiftLeft(-shiftBits);
    }
    
    var bitarr = this.toBitArray();
    
    while (shiftBits--) {
      //shift the bits off the "front" of the array
      //array index 0 is at the front, which corresponds to 
      //LSB on the right of the bit string
      bitarr.shift();
      bitarr.push(0);
    }
    
    this.fromBitArray(bitarr);
    
    return this;
  },
  shiftLeft: function(shiftBits) {
    if (shiftBits < 0) {
      return this.shiftRight(-shiftBits);
    }
    
    var bitarr = this.toBitArray();
    
    while (shiftBits--) {
      //unshift empty bits onto the front of the array
      //and pop the extra bit off the end
      bitarr.unshift(0);
      bitarr.pop();
    }
    
    this.fromBitArray(bitarr);
    
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
