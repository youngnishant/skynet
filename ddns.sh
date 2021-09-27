#!/bin/bash

# Define vars
config="config.json"
ddns="ddns.json"
root=""
env=""
last_ip=""
current_ip=""
new_ip=""
domain=""
host=""
key=""
secret=""

# Transform long options to short ones
for arg in $@
do
    shift
    case $arg in
        --root)   set -- $@ -P;;
        --env)    set -- $@ -e;;
        --domain) set -- $@ -d;;
        --host)   set -- $@ -h;;
        --key)    set -- $@ -k;;
        --secret) set -- $@ -s;;
        *)        set -- $@ $arg
    esac
done

# Check flags
while getopts "P:e:d:h:k:s:" flag
do
    case $flag in
        P) root=$OPTARG;;
        e) env=$OPTARG;;
        d) domain=$OPTARG;;
        h) host=$OPTARG;;
        k) key=$OPTARG;;
        s) secret=$OPTARG
    esac
done


[ ! -z $domain ] && echo "Domain: $domain"
[ ! -z $host ] && echo "Host: $host"
[ ! -z $root ] && echo "root: $root"
[ ! -z $key ] && echo "key: $key"
[ ! -z $secret ] && echo "secret: $secret"

# Config root
[ -z $root ] && root=`pwd`
cd $root

# If config.json exists, try to assign variables
if [ -f "$root/$config" ]
then
    [ -z $env ] && env=`jq -r ".env" $root/$config`
    
    [ -z $domain ] && domain=`jq -r ".$env.godaddy.domain" $root/$config`
    
    [ -z $host ] && host=`jq -r ".$env.godaddy.host" $root/$config`
    
    [ -z $key ] && key=`jq -r ".$env.godaddy.key" $root/$config`

    [ -z $secret ] && secret=`jq -r ".$env.godaddy.secret" $root/$config`
fi

# Check if env exists
while [ -z $env ] || [[ $env = "null" ]]
do
    read -p "Please enter environment: " env
    if [ ! -z $env ] && [[ $env != "null" ]]
    then
        break
    fi
done

[ ! -z $env ] && echo "Environment: $env"
[ ! -z $domain ] && echo "Domain: $domain"
[ ! -z $host ] && echo "Host: $host"

# If ddns.json exists, try to assign variables
if [ -f "$root/$ddns" ]
then
    current_ip=`jq -r ".currentIP" $ddns`
    [[ $current_ip = "null" ]] && current_ip=""
    
    last_ip=`jq -r ".lastIP" $ddns`
    [[ $last_ip = "null" ]] && last_ip="$current_ip"
fi

new_ip=`curl -s "https://api.ipify.org"`

[ ! -z $new_ip ] && echo "IP: $new_ip"

if [ ! -z $key ] && [ ! -z $secret ]
then
    current_ip=`curl -s -X GET "https://api.godaddy.com/v1/domains/$domain/records/A/$host" -H "Authorization: sso-key $key:$secret" | cut -d'[' -f 2 | cut -d']' -f 1 | jq -r '.data'`
fi

if [ ! -z $current_ip ] && [ ! -z $new_ip ] && [ $new_ip != $current_ip ] && [ ! -z $key ] && [ ! -z $secret ] && [ ! -z $domain ] && [ ! -z $host ]
then
    curl -s -X PUT "https://api.godaddy.com/v1/domains/$domain/records/A/$host" -H "Authorization: sso-key $key:$secret" -H "Content-Type: application/json" -d "[{\"data\": \"$new_ip\"}]"
    last_ip=$current_ip
    current_ip=$new_ip
    echo "IP address updated."
else
    echo "IP address not changed. No need to update."
fi

echo "{\"lastIP\": \"$last_ip\", \"currentIP\": \"$current_ip\", \"newIP\": \"$new_ip\", \"datetime\": \"`date`\", \"timestamp\": \"`date +%s%3N`\"}" > $root/ddns.json