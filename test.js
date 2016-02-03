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