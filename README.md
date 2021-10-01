# What is Skynet

Skynet is a tool to help you run Gun instances with ease. It was designed to run on Raspberry Pi computers at home, so it will magically sync your Public IP with GoDaddy DNS and you don't have to use any DDNS service.

Skynet is in development and the "main" branch is the development branch.

# Docs

- Gun: https://github.com/amark/gun
- Skynet: not written yet.

# Features

- Automatically run on system startup.
- Automatically update Godaddy DNS IP.
- Automatically install/renew Let'sEncrypt SSL certificate.
- Automatically pull update from github.
- Automatically join MIMIZA Skynet hub.
- Automatically update IP, heartbeat status to user space.

# Install

## NAT/port forwarding

You might need one of the following things:

- Godaddy domain, API key, API secret: if you don't have static Public IP and want Skynet to automatically update Godaddy DNS IP for you.
- Make sure you have setup NAT/port forwarding so that Let'sEncrypt bot can find you on the internet.

Tested on: Raspberry OS on Raspberry Pi 4, Ubuntu 19.10 on Acer Nitro 5.

## Standalone Gun Peer.

You can install Skynet as a standalone Gun peer.

```bash
git clone https://github.com/mimiza/skynet.git
cd skynet
sudo ./install.sh
```

## NodeJS module

You can also use Skynet in your NodeJS projects.

```bash
npm install https://github.com/mimiza/skynet.git
```

```javascript
import { db } from "skynet"
const main = async () => {
    await db.start()
    const { gun, user } = db
}
main()
```