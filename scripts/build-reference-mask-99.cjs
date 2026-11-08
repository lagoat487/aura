/* Extract the supplied photograph's pixels for the in-game face decal. */
'use strict';
const path=require('node:path'),fs=require('node:fs');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'',process.cwd()]}));
const input=process.argv[2];if(!input)throw Error('Pass the original IMG_3497.jpeg screenshot path.');
const output=path.resolve(__dirname,'../assets/faces/lamine-reference-99.png');
const mask=Buffer.from('<svg width="173" height="193"><path fill="white" d="M 58 5 Q 88 -3 117 10 Q 145 18 156 43 L 163 77 L 166 100 Q 172 116 159 132 Q 150 156 131 174 Q 110 192 91 185 Q 69 179 50 159 Q 30 143 24 122 Q 10 115 9 96 Q 0 77 8 54 Q 12 26 35 14 Z"/></svg>');
sharp(input).extract({left:250,top:207,width:173,height:193}).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toFile(output).then(()=>console.log('Created',path.basename(output)));
