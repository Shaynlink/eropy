'use strict';

function bo(text) {
    const regex = /[A-Z]/g;
    text = text.replaceAll(/ +/g, '_');
    let index = text.search(regex);
    if (index == -1) return text;
    else if (index == 0) text = text.replace(text[index], text[index].toLowerCase());
    else text = text.replace(text[index], `_${text[index].toLowerCase()}`);
    return bo(text);
};

function ob(text) {
    const regex = /_+/g;
    let index = text.search(regex);
    if (index == -1) return text;
    text = text.replace(`_${text[index+1]}`, text[index+1]?.toUpperCase());
    return ob(text);
};

let boed = bo('UserAvatar');

console.log('bo function : %s -> %s', 'userAvatar', boed);

let obed = ob(boed);

console.log('ob function : %s -> %s', boed, obed);