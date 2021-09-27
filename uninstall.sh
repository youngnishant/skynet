#!/bin/bash

# Define vars
who=$USER
config="config.json"
root=""
bash=""
env=""
name=""

# Transform long options to short ones
for arg in $@
do
    shift
    case $arg in
        --root)   set -- $@ -r;;
        --bash)   set -- $@ -b;;
        --name)   set -- $@ -n;;
        *)        set -- $@ $arg
    esac
done

# Check flags
while getopts "r:b:n:" flag
do
    case $flag in
        r) root=$OPTARG;;
        b) bash=$OPTARG;;
        n) name=$OPTARG
    esac
done


# Config root
[ -z $root ] && root=`pwd` # Root folder of main.js

[ -z $bash ] && bash="$(cd "$(dirname "$0")" && pwd)" # Root folder of Bash script files

# Check if jq is installed? Install jq if jq doesn's exist.
if ! command -v jq &> /dev/null
then
    sudo apt install jq
fi

# If config.json exists, try to assign variables
if [ -f $root/$config ]
then
    name=`jq -r ".name" $root/$config`
    [ $name = "null" ] && name=`jq -r ".name" $root/$config`
fi

# READY

# Uninstall
sudo systemctl disable $name
sudo systemctl stop $name
sudo rm /etc/systemd/system/$name.service
sudo systemctl daemon-reload

# Remove old crontab commands if exists
sudo crontab -u $USER -l | grep -v "$bash/" | crontab -u $USER -

echo "
====================
  PEER UNINSTALLED
  Peer: $name
====================
"