"use strict"
var assert = require("assert")
var BitBuffer = require('./bitbuffer').BitBuffer

var suite = suite || (function(){})

var test = test || (
  function test(name, testfun) {
    try {
      testfun();
      console.log(name + ": PASSED");
    } catch (e) {
      console.error(name + ": Failed");
      console.error(e);
    }
  }
);

suite('BitBuffer')

test('#zeroinit', function() {
	var b = new BitBuffer(10)
	assert.equal(b.get(7), false)
	assert.equal(b.get(9), false)
})

test('#set', function() {
	var b = new BitBuffer(32)
	assert.equal(b.get(13), false)
	assert.equal(b.get(14), false)
	assert.equal(b.get(15), false)
	b.set(14, true)
	assert.equal(b.get(13), false)
	assert.equal(b.get(14), true)
	assert.equal(b.get(15), false)
})

function big(bit) {
	var b = new BitBuffer(bit + 1)
  assert.equal(b.get(bit), false)
	b.set(bit, true)
	assert.equal(b.get(bit), true)
  
  var byte_i = (bit / 8)|0;
  
	assert.equal(
		(b.buffer[byte_i] & (1 << (bit % 8))) != 0,
		true
	)
}

test('#bigone_2852448540', function() {
	big(2852448540)
})

test('#bigone_2g', function() {
	big(Math.pow(2,31))
})

test('#bigone_4g', function() {
	big(Math.pow(2,32) - 1)
})

test('#fromBitArray', function() {
  var bitarr = [0,0,0,0,1,1,1,1,0,0,0,1,1,1,0,0,1,1,0,1];
  var b = (new BitBuffer()).fromBitArray(bitarr);
  bitarr.forEach(function(bit, bit_i) {
    assert.equal(!!bit, !!b.get(bit_i))
  }, this)
})

test('#fromBitArray-toBitArray', function() {
  var inbitarr = [0,0,0,0,1,1,1,1,0,0,0,1,1,1,0,0,1,1,0,1];
  var b = (new BitBuffer()).fromBitArray(inbitarr);
  var outbitarr = b.toBitArray();
  inbitarr.forEach(function(bit, bit_i) {
    assert.equal(!!bit, !!outbitarr[bit_i])
  }, this);
})

test('#fromBinaryString', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.buffer[0], 0xf0);
  assert.equal(b.buffer[1], 0x38);
  assert.equal(b.buffer[2], 0x0b);
})

test('#fromBinaryString-toBinaryString', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.toBinaryString(), "10110011100011110000");
})

test('#fromHexString', function() {
  var b = (new BitBuffer()).fromHexString("b38f0");
  assert.equal(b.buffer[0], 0xf0);
  assert.equal(b.buffer[1], 0x38);
  assert.equal(b.buffer[2], 0x0b);
})

test('#fromHexString-toHexString', function() {
  var b = (new BitBuffer()).fromHexString("b38f0");
  assert.equal(b.toHexString(), "b38f0");
})

test('#fromHexString-toBinaryString-toBitArray-toHexString', function() {
  var inhexstr = "b38f0";
  var b = (new BitBuffer());
  var outhexstr = 
    b.fromBitArray(
      b.fromBinaryString(
        b.fromHexString(
          inhexstr
        ).toBinaryString()
      ).toBitArray()
    ).toHexString();
  assert.equal(inhexstr, outhexstr);
})

test('#resize-shrink', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000").resize(8);
  
  assert.equal(b.size, 8);
  assert.equal(b.toBinaryString(), "11110000");
})

test('#resize-grow', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000").resize(24);
  
  assert.equal(b.size, 24);
  assert.equal(b.toBinaryString(), "000010110011100011110000");
})

test('#resize-zero', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000").resize(0);
  
  assert.equal(b.size, 0);
  assert.equal(b.toBinaryString(), "");
})

test('#shiftLeft', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  var size = b.size;
  b.shiftLeft(5);
  
  assert.equal(b.size, size);
  assert.equal(b.toBinaryString(), "01110001111000000000");
})

test('#shiftRight', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  var size = b.size;
  b.shiftRight(5);
  
  assert.equal(b.size, size);
  assert.equal(b.toBinaryString(), "00000101100111000111");
})

test('#subbuffer-full', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.subbuffer().toBinaryString(), "10110011100011110000");
})

test('#subbuffer-middle', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.subbuffer(5, 12).toBinaryString(), "1000111");
})

test('#subbuffer-invalid', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.subbuffer(12, 5).toBinaryString(), "");
})

test('#toNumber', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.toNumber(), 0b10110011100011110000);
})

test('#getValue-uint8', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.getValue(7, 3, "uint"), 0b00000001);
})

test('#getValue-uint16', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.getValue(0, 10, "uint"), 0b0000000011110000);
})

test('#getValue-uint32', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.getValue(0, 17, "uint"), 0b00000000000000010011100011110000);
})

test('#getValue-int8', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.getValue(7, 3, "int"), 0b00000001);
})

test('#getValue-int16', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.getValue(0, 10, "int"), 0b0000000011110000);
})

test('#getValue-int32', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.getValue(0, 17, "int"), 0b00000000000000010011100011110000);
})

test('#getValue-float32', function() {
  var b = (new BitBuffer()).fromHexString("40400000");
  assert.equal(b.getValue(0, 32, "float"), 3);
})

test('#getValue-float64', function() {
  var b = (new BitBuffer()).fromHexString("4008000000000000");
  assert.equal(b.getValue(0, 64, "float"), 3);
})

test('#getValue-rangeError', function() {
  assert.throws(
    function() {
      var b = (new BitBuffer(0)).getValue(0, 33, "int");
    }, RangeError
  )
})