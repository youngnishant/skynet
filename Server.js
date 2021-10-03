import { merge } from "./libs/utils.js"
import http from "http"
import https from "https"
import fs from "fs"
import fetch from "node-fetch"
import publicIP from "public-ip"
import Gun from "gun"
import "gun/sea.js"
import "gun/nts.js"
const sea = Gun.SEA

export class Server {
    constructor(config = {}) {
        // argv[2] -> root
        // argv[3] -> bash
        // argv[4] -> env
        // argv[5] -> name
        // argv[6] -> domain
        // argv[7] -> port
        // argv[8] -> key
        // argv[9] -> cert
        // argv[10] -> pub
        // argv[11] -> priv

        this.config = config || {}

        this.config.root = this.config.root || process.env.ROOT || process.argv[2] || process.env.PWD || process.cwd() || new URL("./", import.meta.url).pathname

        this.config.bash = (this.config.bash || process.env.BASH || process.argv[3] || new URL("./", import.meta.url).pathname).replace(/\/\s*$/, "")

        this.readConfig()

        this.env = this.config.env = this.config.env || process.env.ENV || process.argv[4] || "development"

        this.config.name = process.env.NAME || process.argv[5] || this.config.name || (this.env === "development" ? "localhost" : null)

        this.config[this.env] = this.config[this.env] || {}

        this.config[this.env].www = this.config[this.env]?.www || this.config.bash + "/www"

        this.config[this.env].domain = process.env.DOMAIN || process.argv[6] || this.config[this.env]?.domain || (this.env === "development" ? "localhost" : null)

        this.config[this.env].port = process.env.PORT || process.argv[7] || this.config[this.env]?.port || 8765

        this.config[this.env].peers = this.config[this.env]?.peers || this.config.peers || []

        this.config[this.env].system = this.config[this.env]?.system || {}

        const key = process.env.SSL_KEY || process.argv[8] || this.config[this.env]?.ssl?.key || (this.config[this.env]?.domain && this.env === "production" ? `/etc/letsencrypt/live/${this.config[this.env]?.domain}/privkey.pem` : null)

        const cert = process.env.SSL_CERT || process.argv[9] || this.config[this.env]?.ssl?.cert || (this.config[this.env]?.domain && this.env === "production" ? `/etc/letsencrypt/live/${this.config[this.env]?.domain}/cert.pem` : null)

        this.config[this.env].pair = this.config[this.env]?.pair || {}

        this.config[this.env].pair.pub = process.env.PUB || process.argv[10] || this.config[this.env]?.pair?.pub || null

        this.config[this.env].pair.priv = process.env.PRIV || process.argv[11] || this.config[this.env]?.pair?.priv || null

        this.config[this.env].pair.epub = process.env.EPUB || process.argv[12] || this.config[this.env]?.pair?.epub || null

        this.config[this.env].pair.epriv = process.env.EPRIV || process.argv[13] || this.config[this.env]?.pair?.epriv || null

        const options = {}

        if (key && cert) {
            options.key = fs.existsSync(key) ? fs.readFileSync(key) : null
            options.cert = fs.existsSync(cert) ? fs.readFileSync(cert) : null
        }
        if (options.key && options.cert) this.https = https.createServer(options, Gun.serve(this.config[this.env].www)).listen(this.config[this.env].port)
        else this.http = http.createServer(Gun.serve(this.config[this.env].www)).listen(this.config[this.env].port)

        this.server = this.https || this.http

        this.Gun = Gun
        this.sea = sea
        this.gun = {}
        this.user = {}
    }

    async start(callback = () => {}) {
        await this.syncConfig()
        await this.run()
        await this.online()
        // await this.activate()
        if (callback) await callback(this)
    }

    readConfig() {
        const path = this.config.config || this.config.root + "/config.json"

        if (fs.existsSync(path)) {
            let config = fs.readFileSync(path, "utf8")
            config = JSON.parse(config)
            this.config = merge(this.config, config)
        }

        return this.config
    }

    writeConfig() {
        const path = this.config.config || this.config.root + "/config.json"
        const content = JSON.stringify(this.config, null, 4)
        if (JSON.parse(content)) fs.writeFileSync(path, content)
        return this.config
    }

    syncConfig(callback = () => {}) {
        return new Promise((resolve, reject) => {
            fetch("https://mimiza.com/config.json")
                .then(response => response.json())
                .then(data => {
                    data = data || {}
                    data.system = data.system || {}

                    this.config[this.env].system = data.system.pub && data.system.epub && data.system.cert ? data.system : {}

                    // read config.json file content to this.config
                    this.readConfig()

                    // write config.json file content from this.config
                    this.writeConfig()
                    resolve()
                })
                .catch(e => reject(e))
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.syncConfig(), 60 * 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }

    run(callback = () => {}) {
        return new Promise((resolve, reject) => {
            this.gun = Gun({
                web: this.server,
                peers: this.config[this.env].peers
            })
            this.user = this.gun.user()

            if (!this.config[this.env]?.pair?.pub && !this.config[this.env]?.pair?.priv)
                this.sea.pair((response = {}) => {
                    if (response.err) reject(response.err)
                    else if (response.pub && response.priv && response.epub && response.epriv) {
                        this.config[this.env].pair = response
                        this.writeConfig()
                        resolve(response)
                    }
                })
            else resolve(this.config[this.env].pair)

            console.log(`Environment: ${this.env}\nHTTPS: ${this.https ? true : false}\nHTTP: ${this.http ? true : false}\nPort: ${this.config[this.env].port}`)
        }).then(
            response => {
                if (callback) callback(response)
                return this
            },
            e => console.error(e)
        )
    }

    online(callback = () => {}) {
        return new Promise((resolve, reject) => {
            if (this.user.is || !this.config[this.env].pair) return reject()
            else if (this.config[this.env]?.pair?.pub && this.config[this.env]?.pair?.priv && this.config[this.env]?.pair?.epub && this.config[this.env]?.pair?.epriv) {
                this.user.auth(this.config[this.env]?.pair, response => {
                    if (response.err) return reject(response.err)
                    else if (this.user.is) {
                        console.log(`Authenticated!\nPublic key: ${this.user.is.pub}`)
                        this.config[this.env].pair = this.user._.sea

                        // put basic informations
                        this.user.put(
                            {
                                since: Gun.state(),
                                name: this.config.name || null,
                                domain: this.config[this.env]?.domain || null,
                                https: this.https ? true : false,
                                http: this.http ? true : false,
                                port: this.config[this.env]?.port || null,
                                peers: JSON.stringify(this.config[this.env]?.peers) || null
                            },
                            (response = {}) => {
                                if (response.err) reject(response.err)
                                else resolve(response)
                            }
                        )
                    }
                })
            }
        })
            .then(
                async response => {
                    if (callback) callback(response)

                    // update Godaddy DNS
                    await this.updateDDNS()

                    // update IP
                    await this.updateIP()

                    // update last online timestamp
                    await this.alive()
                    return this
                },
                e => console.error(e)
            )
            .catch(e => {
                if (this.user.is) this.user.leave()
            })
    }

    activate(callback = () => {}) {
        return new Promise((resolve, reject) => {
            if (!this.user.is) return reject()

            const cert = this.config?.[this.env]?.system?.cert?.peer || this.config?.[this.env]?.system?.cert?.message || null

            if (this.config[this.env]?.system?.cert?.message && cert) {
                // link peer to system hub
                const args = [
                    {
                        "#": `~${this.user.is.pub}`
                    },
                    (response = {}) => {
                        if (response.err) reject(response.err)
                        else resolve(response)
                    },
                    {
                        opt: {
                            cert
                        }
                    }
                ]

                this.gun
                    .get(`~${this.config[this.env]?.system?.pub}`)
                    .get("peer")
                    .get(this.user.is.pub)
                    .put(...args)
            }
        }).then(
            response => {
                if (callback) callback(response)
                return this
            },
            e => console.error(e)
        )
    }

    updateDDNS(callback = () => {}) {
        return new Promise((resolve, reject) => {
            if (!this.user.is) return reject()

            const content = fs.existsSync(this.config.root + "/ddns.json") ? fs.readFileSync(this.config.root + "/ddns.json") : null
            const ddns = JSON.parse(content)

            if (ddns && typeof ddns === "object" && Object.keys(ddns).length > 0) {
                this.user.put(ddns, (response = {}) => {
                    if (response.err) reject(response.err)
                    else resolve(response)
                })
            }
            resolve()
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.updateDDNS(), 5 * 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }

    updateIP(callback = () => {}) {
        return new Promise((resolve, reject) => {
            if (!this.user.is) return reject()

            publicIP.v4().then(data => {
                if (data)
                    this.user.put(
                        {
                            newIP: data,
                            timestamp: Gun.state()
                        },
                        (response = {}) => {
                            if (response.err) reject(response.err)
                            else resolve(response)
                        }
                    )
            })
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.updateIP(), 5 * 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }

    alive(callback = () => {}) {
        return new Promise((resolve, reject) => {
            if (!this.user.is) return reject()
            this.user.put(
                {
                    alive: Gun.state()
                },
                (response = {}) => {
                    if (response.err) reject(response.err)
                    else resolve(response)
                }
            )
        }).then(
            response => {
                if (callback) callback(response)
                setTimeout(() => this.alive(), 60 * 1000)
                return this
            },
            e => console.error(e)
        )
    }
}

export default Server
