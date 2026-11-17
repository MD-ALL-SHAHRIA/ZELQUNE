#!/usr/bin/env bash
# Contact sheet of review stills: scripts/sheet.sh <prefix> <cols> <tileWidth> <out.jpg>
set -e
cd "$(dirname "$0")/../out/stills"
files=($(ls "$1"-*.jpg)); n=${#files[@]}; cols=$2; tw=$3
args=(); layout=(); f=""
for i in "${!files[@]}"; do args+=(-i "${files[$i]}"); f+="[$i]scale=$tw:-2[s$i];"; done
read -r h <<<"$(ffprobe -v error -select_streams v -show_entries stream=height,width -of csv=p=0 "${files[0]}" | awk -F, -v tw="$tw" '{printf "%d", $2*tw/$1}')"
inputs=""; for i in "${!files[@]}"; do inputs+="[s$i]"; layout+=("$(( (i%cols)*tw ))_$(( (i/cols)*h ))"); done
ffmpeg -loglevel error -y "${args[@]}" -filter_complex "${f}${inputs}xstack=inputs=$n:layout=$(IFS='|'; echo "${layout[*]}"):fill=black" "$4"
