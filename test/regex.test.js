'use strict';

let r1 = /\w{1,50}@\w{1,50}.\w{1,10}/gim;
console.log(r1.test('me@shaynlink.fr'));
console.log(r1.test('rdddddddddddddddddddddddddddddddddddddddddddddddddddddddddd@shaynlink.freeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeettttttttttttttttttteeeeeeeeeeeeeeeeeeeeeeeeeeeee'));
console.log(r1.test('me@FRgofg$^lgf=s$lg<.fr'));
console.log(r1.test('me@shaynlink'));