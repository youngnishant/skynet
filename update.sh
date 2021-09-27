#!/bin/bash

# Define vars
config="config.json"
root=""
name=""

# Transform long options to short ones
for arg in $@
do
    shift
    case $arg in
        --root)   set -- $@ -r;;
        --name)   set -- $@ -n;;
        *)        set -- $@ $arg
    esac
done

# Check flags
while getopts "r:n:" flag
do
    case $flag in
    r) root=$OPTARG;;
    n) name=$OPTARG
    esac
done

# Config root
[ -z $root ] && root=`pwd` # Root folder of main.js

[ -z $bash ] && bash="$(cd "$(dirname "$0")" && pwd)" # Root folder of Bash script files

# Check if jq is installed? Install jq if jq doesn's exist.
if !command -v jq &> /dev/null
then
sudo apt install jq
fi

# If config.json exists, try to assign variables
if [ -f $root/$config ]
then
name=`jq -r ".name" $root/$config`
[[ $name = "null" ]] && name=`jq -r ".name" $root/$config`
fi

# READY

# Update
sudo git fetch
sudo git pull
sudo npm update
[[ `sudo certbot renew --dry-run` =~ "Congratulations, all renewals succeeded." ]] && sudo certbot renew
sudo systemctl restart $name