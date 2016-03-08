# node-bitbuffer

A bit array, backed by node.js Buffer

## Install

	npm install bitbuffer

## Usage

	var BitBuffer = require('bitbuffer').BitBuffer
	
	//create an empty buffer and flip some bits
	var b = new BitBuffer(10)
	b.get(7) // false
	b.set(7, true)
	b.get(7) // true
	b.toggle(7)
	b.get(7) // false

	//check available encodings
	BitBuffer.isEncoding("bianry") //true
	BitBuffer.isEncoding("hex") //true
	BitBuffer.isEncoding("oct") //false
	
	//create a buffer from a hex string
	var b = new BitBuffer("aaa", "hex")
	b.set(8, true)
	b.set(9, true)
	b.set(10, true)
	b.set(11, true)
	console.log(b.toString("hex")) //"faa"
	
	//create a buffer from a binary string
	var b = new BitBuffer("101100111000", "binary")
	b.get(7) //false
	b.set(7, true)
	b.get(7) // true
	console.log(b.toString("binary")) //"101101111000"
	
	//copy from one BitBuffer to another offset by 4 bits
	var b = new BitBuffer("101100111000", "binary")
	var c = new BitBuffer(16) 
	b.copy(c, 4, 0, 12)
	console.log(c.toString("binary")) //"1011001110000000"
	
	//create a sub-buffer of the current buffer using start and end bits
	var b = new BitBuffer("101100111000", "binary")
	var c= b.subbuffer(3, 8)
	var d= b.subbuffer(3, -4)
	console.log(c.toString("binary")) //"00111"
	console.log(d.toString("binary")) //"00111"
	
	//create an a boolean array with one bit per element
	var b = new BitBuffer("101100111000", "binary")
	b.toBitArray()   //[0,0,0,1,1,1,0,0,1,1,0,1] LSB is at array index=0
	b.toBitArray(-1) //[1,0,1,1,0,0,1,1,1,0,0,0] LSB is at array index=(arr.length-1)
	
	create a buffer from a bit array
	var b = new BitBuffer([0,0,0,1,1,1,0,0,1,1,0,1])
	b.toString("binary") // "101100111000" LSB is at array index=0
	
	//create a buffer from a binary string and shift
	var b = new BitBuffer("111111", "binary")
	b.shiftRight(2)
	console.log(b.toString("binary")) //"001111"
	b.shiftLeft(2)
	console.log(b.toString("binary")) //"111100"
	
	//get numeric value using getValue(offset, [type], [bitwidth])
	var b = new BitBuffer("10101", "binary")
	b.getValue(2, "uint", 1) //1
	b.getValue(0, "int", 3) //-3
	b.getValue(0, "uint") //21
	b.getValue(0, "int") //-11
	b = new BitBuffer("4008000000000000", "hex")
	b.getValue(0, "float") //0.0
	b.getValue(0, "double") //3.0