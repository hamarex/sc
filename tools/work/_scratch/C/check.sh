#!/bin/zsh
cd /Users/hiroham/develop/sc
S=tools/work/_scratch/C
node tools/build_data.js --allow-missing --out $S/data_check.js >/dev/null 2>&1
node tools/validate.js --data $S/data_check.js 2>&1 | grep -E "202[45][ha]-am|c0[456]|ch0[456]|章[456]" | head -${1:-30}
echo checked
