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
  this.size = number;
  
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
      this.size = bitSize;
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
      byteSize = Math.ceil(bitSize / 8),
      bit_i = 0;
    
    if (bitSize < 1) {
      return this.resize(0);
    }

    //clear out the buffer
    if (noresize || byteSize == this.buffer.length) {
      this.buffer.fill(0);
    } else {
      this.buffer = new Buffer(byteSize)
      this.buffer.fill(0);
      this.maxByteIndex = byteSize - 1;
      this.size = bitSize;
    }

    while (bitSize--) {
      this.set(bit_i++, !!+bitstr[bitSize]);
    }
    
    return this;
  },
  toBinaryString: function() {
    return this.toBitArray(-1).join("");
  },
 
  fromHexString: function(hexstr, noresize) {
    //treat the string as an array of bits that has been indexed backwards
    var
      nybbleSize = hexstr.length,
      byteSize = Math.ceil(nybbleSize / 2),
      bitSize = nybbleSize << 2;
    
    if (nybbleSize < 1) {
      return this.resize(0);
    }
    
    //clear out the buffer
    if (noresize || byteSize == this.buffer.length) {
      this.buffer.fill(0);
    } else {
      this.buffer = new Buffer(byteSize);
      this.buffer.fill(0);
      this.maxByteIndex = byteSize - 1;
      this.size = bitSize;
    }
    
    //pad the hex string if it does not contain an integer number of bytes
    if (nybbleSize % 2 != 0) {
      hexstr = "0" + hexstr;
      nybbleSize++;
      bitSize += 4;
    }
    
    for (var bit_i=bitSize-1, nyb_i=0; nyb_i < nybbleSize; bit_i-=8, nyb_i+=2) {
      this.buffer[this._byteIndex(bit_i)]=+("0x"+hexstr[nyb_i]+hexstr[nyb_i+1]);
    }
    
    return this;
  },
  toHexString: function() {
    var hexstr = this.buffer.toString("hex");
    
    //the string will be in whole bytes.
    //However, if our bit buffer size is not in whole bytes,
    //we should chop off any leading nybbles before returning
    return hexstr.substring(hexstr.length - ((this.size / 4) >> 0));
  },
  
  toNumber: function() {
    return +("0x" + this.toHexString());
  },
  
  getValue: function(offset, width, type) {
    var bitbuff;
    type = type;
    offset = +offset;
    offset = offset > 0 ? offset : 0;
    width = +width;
    width = isFinite(width) ? width : (this.size - offset);
    
    if (width == 0) {
      return 0;
    }
    
    //get a copy of this buffer
    bitbuff = this.subbuffer(offset, offset + width);
    
    //if a type is not specified, just convert the new buffer to a number
    if (!type) {
      return bitbuff.toNumber();
    }
    
    //convert width to the closest value of 8, 16, 32, 64
    width = width <= 8 ? 8 : width <=16 ? 16 : width <=32 ? 32 : 64;
    
    //make sure the buffer is large enough to read the number
    if (bitbuff.size < width) {
      bitbuff.resize(width);
    }
    
    return (
      (
        this._getTypedValue[type.toLowerCase()] || {})[width] ||
        this._throwRangeError
      )(bitbuff.buffer, offset);
  },
  _getTypedValue : {
    uint: {
      8: function(bytebuff){
        return bytebuff.readUInt8();
      },
      16: function(bytebuff){
        return bytebuff.readUInt16BE();
      },
      32: function(bytebuff){
        return bytebuff.readUInt32BE();
      }
    },
    int: {
      8: function(bytebuff){
        return bytebuff.readInt8();
      },
      16: function(bytebuff){
        return bytebuff.readInt16BE();
      },
      32: function(bytebuff){
        return bytebuff.readInt32BE();
      }
    },
    float: { 
      32: function(bytebuff){
        return bytebuff.readFloatBE();
      },
      64: function(bytebuff){
        return bytebuff.readDoubleBE();
      }
    } 
  },
  _throwRangeError: function() {
    throw new RangeError("Invalid width for requested type");
  },
  
  resize: function(bitSize) {
    var
      oldSize = this.buffer.length,
      newSize = Math.ceil(bitSize / 8),
      newbuff, lastByte;
      
    if (!isFinite(newSize)) {
      return this;
    }
    
    if (newSize > oldSize) {
      newbuff = new Buffer(newSize);
      newbuff.fill(0);
      
      //if this is an LE system, we need to make sure the start byte is offset
      //so the extra size will come in on the left side
      this.buffer.copy(
        newbuff, (os.endianness() == "LE" ? newSize - oldSize : 0), 0, oldSize
      );
      this.buffer = newbuff;
    
    } else {
      //We are shirinking the buffer, instead of creating a new buffer 
      //and copying, we can just take the slice of the data we need.
      if (os.endianness() == "LE") {
        //If this is an LE system we want the higher indexed bytes
        this.buffer = this.buffer.slice((oldSize - newSize), oldSize);
      } else {
        this.buffer = this.buffer.slice(0, newSize);
      }
    }

    //update the size properties
    this.maxByteIndex = this.buffer.length - 1;
    this.size = bitSize;

    if (bitSize % 8 != 0) {
      //zero out any bits beyond the specified size in the last byte
      lastByte = this._byteIndex(bitSize);
      newbuff[lastByte] = newbuff[lastByte] & (Math.pow(2, bitSize)-1);
    }
    
    return this;
  },
  subbuffer: function(begin, end) {
    var newbuff, size; 
    
    //make sure begin and end are valid
    begin = isFinite(+begin) ? begin : 0,
    end = isFinite(+end) ? +end : this.size;
    begin = begin >= 0 ? begin : 0;
    end = end <= this.size ? end : this.size;
    size = end - begin;
    if (size < 1) {
      return new BitBuffer(0);
    }
    
    newbuff = new BitBuffer(size);
    for (var bit_i = 0; bit_i < size; bit_i++) {
      newbuff.set(bit_i, this.get(bit_i + begin));
    }
    return newbuff;
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
