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
  
  this._getTypedValue = os.endianness() == "LE" ?
    this._getTypedValueLE : this._getTypedValueBE;  
}


BitBuffer.prototype = {
	set: function(index, bool) {
		if(bool) {
			this.buffer[index >>> 3] |= 1 << (index % 8);
		} else {
			this.buffer[index >>> 3] &= ~(1 << (index % 8));
		}
	},
	get: function(index) {
    return (this.buffer[index >>> 3] & (1 << (index % 8))) != 0;
	},
	toggle: function(index) {
		this.buffer[index >>> 3] ^= 1 << (index % 8);
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
      this.buffer[bit_i >>> 3]=+("0x"+hexstr[nyb_i]+hexstr[nyb_i+1]);
    }
    
    return this;
  },
  toHexString: function() {
    var
      byte_i = this.buffer.length,
      hexarr = [],
      hexstr;
    
    while (byte_i--) {
      hexarr.push(
        (this.buffer[byte_i] < 0x10 ? "0" : "") +
        this.buffer[byte_i].toString(16)
      );
    }
    
    hexstr = hexarr.join("");
   
    //the string will be in whole bytes.
    //However, if our bit buffer size is not in whole bytes,
    //we should chop off any leading nybbles before returning
    return hexstr.substring(hexstr.length - (Math.ceil(this.size / 4)));
  },
  
  fromUInt: function(num) {
    var byteSize, bitSize, buff;
    
    if (num > Number.MAX_SAFE_INTEGER) {
      throw RangeError();
    }
    
    bitSize = num < 0x100 ? 8 : num < 0x10000 ? 16 : num < 0x100000000 ? 32 : 64;
    buff = new BitBuffer(bitSize);
    
    byteSize = buff.buffer.length;
    for(var byte_i = 0, offset = 0; byte_i < byteSize; byte_i++, offset += 8) {
      buff.buffer[byte_i] = (num >> offset) & 0xff;
    }
    
    this.buffer = buff.buffer;
    this.size = buff.size;
    this.maxByteIndex = buff.maxByteIndex;
    
    return this
  },
  toNumber: function() {
    return +("0x" + this.toHexString());
  },
  
  getValue: function(offset, type, width) {
    var bitbuff;
    
    if (this.size == 0) {
      return 0;
    }
    
    type = (type || "").toLowerCase();
    offset = +offset;
    offset = offset > 0 ? offset : 0;
    width = +width;

    //floats and doubles should have a width of either 32 or 64  
    if (type == "float" && !width) {
      width = 32;
    } else if (type == "double") {
      type = "float";
      width = 64;
    }
    
    //if width is not specified,
    //get everything from the offet to the end of the buffer
    if (!width) {
      width = this.size - offset;
    }

    //get a copy of this buffer
    bitbuff = this.subbuffer(offset, offset + width);

    //if a type is not specified, just convert the new buffer to a number
    if (!type) {
      return bitbuff.toNumber();
    }
    
    //convert width to the closest value of 8, 16, 32
    width = width <= 8 ? 8 : width <=16 ? 16 : width <=32 ? 32 : width;

    //make sure the buffer is large enough to read the number
    if (bitbuff.size < width) {
      bitbuff.resize(width, (type == "int"));
    }
    
    return (
      (
        this._getTypedValue[type] || {})[width] ||
        this._throwRangeError
      )(bitbuff.buffer, offset);
  },
  _getTypedValue : null,
  _getTypedValueLE : {
    uint: {
      8: function(bytebuff){
        return bytebuff.readUInt8(0);
      },
      16: function(bytebuff){
        return bytebuff.readUInt16LE(0);
      },
      32: function(bytebuff){
        return bytebuff.readUInt32LE(0);
      }
    },
    int: {
      8: function(bytebuff){
        return bytebuff.readInt8(0);
      },
      16: function(bytebuff){
        return bytebuff.readInt16LE(0);
      },
      32: function(bytebuff){
        return bytebuff.readInt32LE(0);
      }
    },
    float: { 
      32: function(bytebuff){
        return bytebuff.readFloatLE(0);
      },
      64: function(bytebuff){
        return bytebuff.readDoubleLE(0);
      }
    } 
  },
  _getTypedValueBE : {
    uint: {
      8: function(bytebuff){
        return bytebuff.readUInt8(0);
      },
      16: function(bytebuff){
        return bytebuff.readUInt16BE(0);
      },
      32: function(bytebuff){
        return bytebuff.readUInt32BE(0);
      }
    },
    int: {
      8: function(bytebuff){
        return bytebuff.readInt8(0);
      },
      16: function(bytebuff){
        return bytebuff.readInt16BE(0);
      },
      32: function(bytebuff){
        return bytebuff.readInt32BE(0);
      }
    },
    float: { 
      32: function(bytebuff){
        return bytebuff.readFloatBE(0);
      },
      64: function(bytebuff){
        return bytebuff.readDoubleBE(0);
      }
    } 
  },
  _throwRangeError: function() {
    throw new RangeError("Invalid width for requested type.");
  },
  
  resize: function(newBitSize, propagateSignBit) {
    var
      oldBitSize = this.size,
      oldByteSize = this.buffer.length,
      newByteSize = Math.ceil(newBitSize / 8),
      newbuff, lastByte, bit_i;

    if (!isFinite(newByteSize)) {
      return this;
    }
    
    //check if both sign propagation flag and sign bit are set
    propagateSignBit = propagateSignBit & this.get(oldBitSize - 1);
    
    if (newByteSize > oldByteSize) {
      newbuff = new Buffer(newByteSize);
      newbuff.fill(0);
      
      this.buffer.copy(newbuff, 0, 0, oldByteSize);
      this.buffer = newbuff;

    } else {
      //We are shirinking the buffer, instead of creating a new buffer 
      //and copying, we can just take the slice of the data we need.
      this.buffer = this.buffer.slice(0, newByteSize);
    }

    //update the size properties
    this.maxByteIndex = this.buffer.length - 1;
    this.size = newBitSize;

    if (newBitSize % 8 != 0) {
      //zero out any bits beyond the specified size in the last byte
      lastByte = newBitSize >>> 3;
      newbuff[lastByte] = newbuff[lastByte] & (Math.pow(2, newBitSize)-1);
    }
    
    //flip all of the leading bits if we are propagating sign
    if (propagateSignBit) {
      bit_i = oldBitSize;
      while (bit_i < newBitSize) {
        this.set(bit_i++, 1);
      }
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
  }
}

exports.BitBuffer = BitBuffer
