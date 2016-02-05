# node-bitbuffer

A bit array, backed by node.js Buffer

## Install

	npm install bitbuffer

## Usage
    var BitBuffer = require('bitbuffer').BitBuffer
	var b;
	
    //create an empty buffer and flip some bits
	b = new BitBuffer(10)
	b.get(7) // false
	b.set(7, true)
	b.get(7) // true
	b.toggle(7)
	b.get(7) // false
    
	//create a buffer from a hex string
	b = (new BitBuffer()).fromHexString("aaa");
	b.set(8, true)
	b.set(9, true)
	b.set(10, true)
	b.set(11, true)
	console.log(b.toHexString()) //"faa"
	
	//create a buffer from a binary string
	b = (new BitBuffer()).fromBinaryString("101100111000");
	b.get(7) //false
	b.set(7, true)
	b.get(7) // true
	console.log(b.toBinaryString()) //"101101111000"
	
	//create an a boolean array with one bit per element
	b = (new BitBuffer()).fromBinaryString("101100111000");
	b.toBitArray();   //[0,0,0,1,1,1,0,0,1,1,0,1] LSB is at array index=0
	b.toBitArray(-1); //[1,0,1,1,0,0,1,1,1,0,0,0] LSB is at array index=(arr.length-1)
	
	create a buffer from a bit array
	b = (new BitBuffer()).fromBitArray([0,0,0,1,1,1,0,0,1,1,0,1]);
	b.toBinaryString(); // "101100111000" LSB is at array index=0
	
	//create a buffer from a binary string and shift
	b = (new BitBuffer()).fromBinaryString("111111");
	b.shiftRight(2)
	console.log(b.toBinaryString()) //"001111"
	b.shiftLeft(2)
	console.log(b.toBinaryString()) //"111100"
	
	//resize a buffer
	b = (new BitBuffer()).fromBinaryString("111111");
	b.resize(9)
	console.log(b.toBinaryString()) //"000111111"
	
	//get numeric value using getValue(offset, [type], [bitwidth])
	b = (new BitBuffer()).fromBinaryString("10101");
	b.getValue(2, "uint", 1) //1
	b.getValue(0, "int", 3) //-3
	b.getValue(0, "uint") //21
	b.getValue(0, "int") //-11
	b = (new BitBuffer()).fromHexString("4008000000000000");
	b.getValue(0, "float") //0.0
	b.getValue(0, "double") //3.0
	
	