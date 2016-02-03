"use strict"
var assert = require("assert")
var BitBuffer = require('./bitbuffer').BitBuffer
var endianness = require('os').endianness();

if (!test) {
  var test = (
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
}

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
  if (endianness == "LE") {
    byte_i = b.buffer.length - byte_i - 1;
  }
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

test('#bigone_8g', function() {
	assert.throws(
		function() {
      var b = new BitBuffer(Math.pow(2,33));
		},
		RangeError
	)
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
  assert.equal(b.buffer[endianness == "LE" ? 2 : 0], 0xf0);
  assert.equal(b.buffer[1], 0x38);
  assert.equal(b.buffer[endianness == "LE" ? 0 : 2], 0x0b);
})

test('#fromBinaryString-toBinaryString', function() {
  var b = (new BitBuffer()).fromBinaryString("10110011100011110000");
  assert.equal(b.toBinaryString(), "10110011100011110000");
})

test('#fromHexString', function() {
  var b = (new BitBuffer()).fromHexString("b38f0");
  assert.equal(b.buffer[endianness == "LE" ? 2 : 0], 0xf0);
  assert.equal(b.buffer[1], 0x38);
  assert.equal(b.buffer[endianness == "LE" ? 0 : 2], 0x0b);
})

test('#fromHexString-toHexString', function() {
  var b = (new BitBuffer()).fromHexString("b38f0");
  assert.equal(b.toBinaryString(), "10110011100011110000");
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